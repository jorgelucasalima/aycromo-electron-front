import sys, time
from ultralytics import YOLO
import tempfile
import os
import yaml

images_path = 'public/datasets/yolo/images'
base_dir = os.path.abspath(images_path.rstrip('/\\'))
yaml_content = {'path': os.path.abspath('.'), 'train': 'public/datasets/yolo/images', 'val': 'public/datasets/yolo/images', 'names': {0: 'cromossomo'}}
yaml_path = 'local_temp.yaml'
with open(yaml_path, 'w') as f: yaml.dump(yaml_content, f)

model = YOLO('best-yolo11.pt')
start = time.time()
metrics = model.val(data=yaml_path, verbose=False, plots=False, save=False, save_json=False, project=tempfile.gettempdir(), device='cpu', workers=0, imgsz=416)
print("Time CPU:", time.time() - start)
