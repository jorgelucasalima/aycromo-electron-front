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

        # Processa cada imagem
        for img_path in image_paths:
            if not os.path.exists(img_path):
                results_dict[img_path] = {"error": "Arquivo não encontrado", "count": 0}
                continue

            # verbose=False impede que o YOLO suje o console com logs extras
            results = model.predict(img_path, verbose=False)
            
            # Conta as caixas detectadas (len(boxes))
            # Ajuste aqui se quiser filtrar por classe ou confiança
            count = len(results[0].boxes)
            details = []
            
            # Formata a saída
            results_dict[img_path] = {
                "count": count,
                "status": "success",
                "details": details
            }

        # IMPRIME APENAS O JSON FINAL (Importante!)
        print(json.dumps(results_dict))

    except Exception as e:
        sys.stderr.write(f"Erro durante a inferência: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()