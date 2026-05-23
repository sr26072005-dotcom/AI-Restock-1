from ultralytics import YOLO
import os

def main():
    # Path to the last checkpoint
    last_checkpoint = os.path.abspath("runs/obb/train/weights/last.pt")
    
    if os.path.exists(last_checkpoint):
        print(f"Resuming training from {last_checkpoint}...")
        model = YOLO(last_checkpoint)
        # When resuming, you only need to call train(resume=True)
        # Ultralytics will load all previous settings from the checkpoint
        model.train(resume=True)
    else:
        # Start fresh if no checkpoint is found
        print("Starting fresh training...")
        model = YOLO("yolov8s-obb.pt")
        data_path = os.path.abspath("data.yaml")
        model.train(
            data=data_path, 
            epochs=150,
            imgsz=800,
            batch=4,
            degrees=15.0,
            mixup=0.1,
            device="cpu",
            plots=True
        )

if __name__ == "__main__":
    main()
