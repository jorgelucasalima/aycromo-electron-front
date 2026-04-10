import sys
import json
import os

# Tenta importar o YOLO. Se falhar, avisa no erro padrão para o Electron capturar.
try:
    from ultralytics import YOLO
except ImportError:
    sys.stderr.write("ERRO: Biblioteca 'ultralytics' não encontrada. Instale com: pip install ultralytics")
    sys.exit(1)

def main():
    # O Electron envia: [script_path, model_path, img1_path, img2_path, ...]
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Argumentos insuficientes"}))
        return

    model_path = sys.argv[1]
    image_paths = sys.argv[2:]

    # Verifica se o modelo existe
    if not os.path.exists(model_path):
        # Se for 'default' ou nome curto, tenta baixar/carregar do cache do YOLO
        pass 

    try:
        # Carrega o modelo
        model = YOLO(model_path)
        
        results_dict = {}

        try:
            # TENTATIVA 1: ULTRALYTICS (MÁGICA YOLO)
            model = YOLO(model_path)
            
            # Testa a estrutura do predict no primeiro arquivo para falhar logo se for incompatível
            if len(image_paths) > 0:
                _ = model.predict(image_paths[0], verbose=False, conf=0.15)
                
            for img_path in image_paths:
                if not os.path.exists(img_path):
                    results_dict[img_path] = {"error": "Arquivo não encontrado", "count": 0}
                    continue

                results = model.predict(img_path, verbose=False, conf=0.15)
                boxes_obj = results[0].boxes
                count = len(boxes_obj)
                details = []

                if count > 0:
                    xywh_data = boxes_obj.xywh.cpu().numpy()
                    for b in xywh_data:
                        details.append({
                            "x": float(b[0] - b[2]/2),
                            "y": float(b[1] - b[3]/2),
                            "w": float(b[2]),
                            "h": float(b[3])
                        })
                
                results_dict[img_path] = {
                    "count": count,
                    "status": "success",
                    "details": details
                }
                
        except Exception as e_yolo:
            # TENTATIVA 2: ONNXRUNTIME CUSTOMIZADO PARA MODELOS NÃO-YOLO (Ex: Faster R-CNN)
            # Se falhou, provavelmente porque as dimensões exigidas ou a topologia da rede são puras
            import onnxruntime as ort
            import cv2
            import numpy as np
            
            session = ort.InferenceSession(model_path)
            inputs = session.get_inputs()
            outputs_meta = session.get_outputs()
            
            input_name = inputs[0].name
            input_shape = inputs[0].shape
            
            # Dinamicamente descobre as exigências da camada de convolução primária
            C = input_shape[1] if isinstance(input_shape[1], int) else 3
            H = input_shape[2] if isinstance(input_shape[2], int) else 224
            W = input_shape[3] if isinstance(input_shape[3], int) else 224
            
            out_names = [o.name for o in outputs_meta]
            
            for img_path in image_paths:
                if not os.path.exists(img_path):
                    results_dict[img_path] = {"error": "Arquivo não encontrado", "count": 0}
                    continue
                    
                img = cv2.imread(img_path)
                if img is None:
                    results_dict[img_path] = {"error": "Imagem corrompida", "count": 0}
                    continue
                    
                orig_H, orig_W = img.shape[:2]
                
                # Pre-Processamento rígido
                if C == 1:
                    img_processed = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    img_resized = cv2.resize(img_processed, (W, H))
                    img_input = img_resized.astype(np.float32) / 255.0
                    img_input = np.expand_dims(img_input, axis=0) # Canal
                    img_input = np.expand_dims(img_input, axis=0) # Batch
                else:
                    img_processed = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    img_resized = cv2.resize(img_processed, (W, H))
                    img_input = img_resized.astype(np.float32) / 255.0
                    img_input = np.transpose(img_input, (2, 0, 1)) # HWC para CHW
                    img_input = np.expand_dims(img_input, axis=0) # Batch
                    
                # Executa predição cega
                outputs = session.run(None, {input_name: img_input})
                
                details = []
                
                # Pós-processamento clássico para multi-saídas (boxes, scores, labels) usado em Faster R-CNN PyTorch/Detectron2
                if "boxes" in out_names and "scores" in out_names:
                    idx_boxes = out_names.index("boxes")
                    idx_scores = out_names.index("scores")
                    
                    boxes = outputs[idx_boxes]
                    scores = outputs[idx_scores]
                    
                    scale_x = orig_W / W
                    scale_y = orig_H / H
                    
                    # Caso de Batch_size retornado como dimensão 0 ou achatada
                    if len(boxes.shape) == 3 and boxes.shape[0] == 1:
                        boxes = boxes[0]
                    if len(scores.shape) == 2 and scores.shape[0] == 1:
                        scores = scores[0]
                    elif len(scores.shape) == 1:
                        pass # Normal
                        
                    for i in range(len(scores)):
                        if scores[i] > 0.15:
                            # Faster R-CNN devolve [xmin, ymin, xmax, ymax]
                            xmin = boxes[i][0]
                            ymin = boxes[i][1]
                            xmax = boxes[i][2]
                            ymax = boxes[i][3]
                            
                            w_box = xmax - xmin
                            h_box = ymax - ymin
                            
                            # Transforma de pixel 224x224 de volta pro pixel do mapa real da imagem 
                            details.append({
                                "x": float(xmin * scale_x),
                                "y": float(ymin * scale_y),
                                "w": float(w_box * scale_x),
                                "h": float(h_box * scale_y)
                            })
                            
                results_dict[img_path] = {
                    "count": len(details),
                    "status": "success custom-onnx",
                    "details": details
                }

        # IMPRIME APENAS O JSON FINAL (Importante!)
        print(json.dumps(results_dict))

    except Exception as e:
        sys.stderr.write(f"Erro durante a inferência: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()