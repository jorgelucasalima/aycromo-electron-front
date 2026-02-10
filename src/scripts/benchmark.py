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

def create_temp_yaml(images_path):
    """
    Cria um arquivo YAML temporário necessário para a validação do YOLO.
    O YOLO exige saber onde estão as imagens e as classes.
    """
    # Ex: datasets/yolo/images -> datasets/yolo
    base_dir = os.path.dirname(images_path.rstrip('/\\'))
    
    # O YOLO espera que a pasta 'labels' esteja ao lado da pasta 'images'
    # Se suas imagens estão em .../dataset/images, labels devem estar em .../dataset/labels
    
    yaml_content = {
        'path': os.path.abspath(base_dir), # Caminho absoluto da raiz do dataset
        'train': 'images', 
        'val': 'images',   # Usamos as mesmas imagens para validar neste benchmark rápido
        'names': {0: 'cromossomo'} # Ajuste se tiver mais classes
    }
    
    yaml_path = os.path.join(base_dir, 'temp_benchmark.yaml')
    
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f)
        
    return yaml_path

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

        # 2. Cria o arquivo de configuração YAML
        yaml_path = create_temp_yaml(dataset_images_path)

        # 3. Carrega o Modelo
        # Se for 'default', o ultralytics baixa sozinho, mas idealmente passamos o path
        model = YOLO(model_path)

        # 4. Executa a Validação (Calcula mAP, Precision, Recall)
        # verbose=False, plots=False para ser rápido e silencioso
        metrics = model.val(data=yaml_path, verbose=False, plots=False)

        # 5. Formata a Saída
        output = {
            "model": os.path.basename(model_path),
            "map50": round(metrics.box.map50, 4),    # mAP @ 50%
            "map5095": round(metrics.box.map, 4),    # mAP @ 50-95%
            "precision": round(metrics.box.mp, 4),   # Média Precisão
            "recall": round(metrics.box.mr, 4),      # Média Recall
            "speed": round(metrics.speed['inference'], 2) # ms por imagem
        }

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