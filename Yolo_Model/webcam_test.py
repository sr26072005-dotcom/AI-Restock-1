from ultralytics import YOLO
import os

def live_test():
    # Load the best weights from your training
    model_path = os.path.join("runs", "obb", "train", "weights", "best.pt")
    
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found. Ensure training is complete.")
        return

    # Load the model
    model = YOLO(model_path)

    print("Starting live camera feed... Press 'q' to quit.")

    # Run inference on the webcam
    # source=0 is usually the default built-in camera
    results = model.predict(
        source=0, 
        show=True,      # Displays the video window
        conf=0.35,      # Confidence threshold
        imgsz=800,      # Resolution
        stream=True     # Efficiently handle real-time video stream
    )

    # This loop keeps the window open and processes the stream
    for r in results:
        pass

if __name__ == "__main__":
    live_test()
