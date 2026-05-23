from ultralytics import YOLO
import os

def test():
    # Load the best weights from the NEW training run
    # Note: If you run training again, it might save to 'runs/obb/train2'
    # You should check which 'train' folder is the latest.
    model_path = os.path.join("runs", "obb", "train", "weights", "best.pt")
    
    if not os.path.exists(model_path):
        # Fallback to check train2, train3 etc if you ran it multiple times
        print(f"Warning: {model_path} not found. Searching for latest weights...")
        # This is a simple way to find the latest training run weights
        import glob
        weights = glob.glob("runs/obb/train*/weights/best.pt")
        if weights:
            model_path = sorted(weights)[-1]
            print(f"Using latest weights: {model_path}")
        else:
            print("Error: No weights found. Please train the model first.")
            return

    model = YOLO(model_path)

    # Run prediction
    results = model.predict(
        source="C:/Users/Sridhar Subbaiya/Downloads/test_shelf3.jpg", 
        save=True, 
        conf=0.35,      # Higher confidence reduces "fake" counts (False Positives)
        iou=0.5,        # Lower IOU threshold helps separate overlapping boxes
        imgsz=800       # Match the imgsz used in training
    )

    # Print detection counts for each image
    for r in results:
        count = len(r.obb) # Number of Oriented Bounding Boxes detected
        print(f"Image: {os.path.basename(r.path)} | Detections: {count}")

    print(f"/nVisual results saved to: {results[0].save_dir}")

if __name__ == "__main__":
    test()
