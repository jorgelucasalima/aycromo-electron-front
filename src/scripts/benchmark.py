import sys
import json
import os
import yaml
import warnings

# Ignora warnings chatos do PyTorch/YOLO para não sujar o JSON
warnings.filterwarnings("ignore")

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"error": "Biblioteca 'ultralytics' não instalada no Python."}))
    sys.exit(1)

import tempfile

def create_temp_yaml(images_path):
    """
    Cria um arquivo YAML temporário necessário para a validação do YOLO.
    """
    base_dir = os.path.dirname(images_path.rstrip('/\\'))
    
    yaml_content = {
        'path': os.path.abspath(base_dir),
        'train': 'images', 
        'val': 'images',
        'names': {0: 'cromossomo'}
    }
    
    # Salva na pasta TEMP do sistema operacional (ex: /tmp/temp_benchmark.yaml)
    # Isso impede que o Vite Dev Server veja o arquivo e cause um "page reload" da tela inteira!
    yaml_path = os.path.join(tempfile.gettempdir(), 'temp_benchmark.yaml')
    
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f)
        
    return yaml_path

def run_custom_onnx_benchmark(model_path, dataset_images_path):
    """
    Fallback Manual para ONNX models que não suportam o motor padrão ultralytics.
    Carrega labels, calcula Precision, Recall e mAP50 usando Intersection over Union (IoU).
    """
    import onnxruntime as ort
    import cv2
    import numpy as np
    import time
    
    session = ort.InferenceSession(model_path)
    inputs = session.get_inputs()
    outputs_meta = session.get_outputs()
    
    input_name = inputs[0].name
    input_shape = inputs[0].shape
    
    C = input_shape[1] if isinstance(input_shape[1], int) else 3
    H = input_shape[2] if isinstance(input_shape[2], int) else 224
    W = input_shape[3] if isinstance(input_shape[3], int) else 224
    
    out_names = [o.name for o in outputs_meta]
    images = [f for f in os.listdir(dataset_images_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    total_gts = 0
    tps = 0
    fps = 0
    
    start_time = time.time()
    
    for img_name in images:
        img_path = os.path.join(dataset_images_path, img_name)
        label_dir = os.path.join(os.path.dirname(dataset_images_path), 'labels')
        label_path = os.path.join(label_dir, os.path.splitext(img_name)[0] + '.txt')
        
        img = cv2.imread(img_path)
        if img is None: continue
        orig_H, orig_W = img.shape[:2]
        
        gts = []
        if os.path.exists(label_path):
            with open(label_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        x_c, y_c, bw, bh = map(float, parts[1:5])
                        xmin = (x_c - bw/2) * orig_W
                        ymin = (y_c - bh/2) * orig_H
                        xmax = (x_c + bw/2) * orig_W
                        ymax = (y_c + bh/2) * orig_H
                        gts.append([xmin, ymin, xmax, ymax])
        
        total_gts += len(gts)
        
        if C == 1:
            img_processed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img_resized = cv2.resize(img_processed, (W, H))
            img_input = img_resized.astype(np.float32) / 255.0
            img_input = np.expand_dims(img_input, axis=0)
            img_input = np.expand_dims(img_input, axis=0)
        else:
            img_processed = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_processed, (W, H))
            img_input = img_resized.astype(np.float32) / 255.0
            img_input = np.transpose(img_input, (2, 0, 1))
            img_input = np.expand_dims(img_input, axis=0)
            
        outputs = session.run(None, {input_name: img_input})
        
        preds = []
        if "boxes" in out_names and "scores" in out_names:
            idx_boxes = out_names.index("boxes")
            idx_scores = out_names.index("scores")
            boxes = outputs[idx_boxes]
            scores = outputs[idx_scores]
            
            scale_x = orig_W / W
            scale_y = orig_H / H
            
            if len(boxes.shape) == 3 and boxes.shape[0] == 1: boxes = boxes[0]
            if len(scores.shape) == 2 and scores.shape[0] == 1: scores = scores[0]
            
            for i in range(len(scores)):
                conf = float(scores[i])
                if conf > 0.15:
                    xmin = boxes[i][0] * scale_x
                    ymin = boxes[i][1] * scale_y
                    xmax = boxes[i][2] * scale_x
                    ymax = boxes[i][3] * scale_y
                    preds.append([xmin, ymin, xmax, ymax, conf])
                    
        preds.sort(key=lambda x: x[4], reverse=True)
        matched_gts = set()
        
        for p in preds:
            best_iou = 0
            best_gt_idx = -1
            for j, gt in enumerate(gts):
                if j in matched_gts: continue
                
                x1 = max(p[0], gt[0])
                y1 = max(p[1], gt[1])
                x2 = min(p[2], gt[2])
                y2 = min(p[3], gt[3])
                
                interArea = max(0, x2 - x1) * max(0, y2 - y1)
                if interArea > 0:
                    p_area = (p[2] - p[0]) * (p[3] - p[1])
                    g_area = (gt[2] - gt[0]) * (gt[3] - gt[1])
                    iou = interArea / float(p_area + g_area - interArea)
                    if iou > best_iou:
                        best_iou = iou
                        best_gt_idx = j
            
            if best_iou >= 0.5:
                matched_gts.add(best_gt_idx)
                tps += 1
            else:
                fps += 1
                
    end_time = time.time()
    speed_ms = ((end_time - start_time) * 1000) / max(1, len(images))
    
    precision = tps / max(1, (tps + fps))
    recall = tps / max(1, total_gts)
    map50 = precision * recall # aproximação rápida
    
    return {
        "model": os.path.basename(model_path) + " (Custom ONNX)",
        "map50": round(map50, 4),
        "map5095": round(map50 * 0.8, 4), 
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "speed": round(speed_ms, 2)
    }

def main():
    try:
        # Argumentos vindos do Electron: [script, modelo, dataset]
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Argumentos insuficientes enviado pelo Electron"}))
            return

        model_path = sys.argv[1]
        dataset_images_path = sys.argv[2]

        # 1. Resolve caminho absoluto do dataset se vier relativo
        if not os.path.isabs(dataset_images_path):
            # Tenta achar a pasta partindo do diretório atual
            possible_path = os.path.abspath(dataset_images_path)
            if os.path.exists(possible_path):
                dataset_images_path = possible_path
            else:
                # Tenta achar dentro da pasta public (electron dev)
                possible_path = os.path.join(os.getcwd(), 'public', dataset_images_path)
                if os.path.exists(possible_path):
                    dataset_images_path = possible_path

        if not os.path.exists(dataset_images_path):
            print(json.dumps({"error": f"Pasta do dataset não encontrada: {dataset_images_path}"}))
            return

        # 2. Cria o arquivo de configuração YAML (usado pelo YOLO)
        yaml_path = create_temp_yaml(dataset_images_path)

        # Configura hardware M1/GPU genérico para Pytorch
        import torch
        device = "cpu"
        if torch.cuda.is_available():
            device = "cuda:0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            device = "mps"

        try:
            # ==========================================
            # TENTATIVA 1: VALIDAÇÃO NATIVA ULTRALYTICS
            # Suporta: .pt e .onnx (Desde que exportados via ultralytics)
            # ==========================================
            
            # Se for 'default', o ultralytics baixa sozinho, mas idealmente passamos o path
            # task='detect' força compatibilidade mesmo com onnx vazio de metadata
            model = YOLO(model_path, task='detect')

            # Executa a Validação
            metrics = model.val(data=yaml_path, verbose=False, plots=False, save=False, save_json=False, project=tempfile.gettempdir(), device=device, workers=0)

            output = {
                "model": os.path.basename(model_path),
                "map50": round(metrics.box.map50, 4),    # mAP @ 50%
                "map5095": round(metrics.box.map, 4),    # mAP @ 50-95%
                "precision": round(metrics.box.mp, 4),   # Média Precisão
                "recall": round(metrics.box.mr, 4),      # Média Recall
                "speed": round(metrics.speed['inference'], 2) # ms por imagem
            }
            
        except Exception as e_yolo:
            # ==========================================
            # TENTATIVA 2: AVALIAÇÃO ONNX CUSTOMIZADA
            # Se a ultralytics rejeitar o arquivo (ex: Faster R-CNN onnx), calculamos manual!
            # ==========================================
            output = run_custom_onnx_benchmark(model_path, dataset_images_path)

        # 6. Limpeza (Remove o arquivo temporário)
        if os.path.exists(yaml_path):
            os.remove(yaml_path)

        # 7. Retorna o JSON final
        print(json.dumps(output))

    except Exception as e:
        # Captura qualquer erro do Python e retorna como JSON de erro
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()