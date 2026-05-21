import os
import datetime
from ultralytics import YOLO
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Get the directory of the current file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model configuration
model_path = os.path.join(BASE_DIR, 'yolov8n.pt') 
model = YOLO(model_path) 

# Storage Bucket configuration
BUCKET_NAME = "Details"

def analyze_shelf(image_name, shop_id="UNKNOWN", target_classes=None):
    """
    1. Downloads image from Supabase 'images/' folder.
    2. Runs AI detection with improved accuracy settings.
    3. Uploads verified image to Supabase 'validated images/' folder.
    4. Returns vision count and the public cloud URL.
    """
    if target_classes is None:
        target_classes = [39, 41, 73] # bottle, cup, refrigerator/box (defaults)

    # Create local temp paths
    temp_download = os.path.join(BASE_DIR, 'static', 'uploads', image_name)
    os.makedirs(os.path.dirname(temp_download), exist_ok=True)

    # 1. DOWNLOAD FROM CLOUD
    try:
        print(f"DEBUG: Downloading {image_name} from Supabase Storage...")
        res = supabase.storage.from_(BUCKET_NAME).download(f"images/{image_name}")
        with open(temp_download, "wb") as f:
            f.write(res)
    except Exception as e:
        print(f"ERROR: Cloud download failed: {e}. Falling back to local if exists.")
        if not os.path.exists(temp_download):
            return 0, None

    # 2. AI ANALYSIS (IMPROVED ACCURACY)
    # Using 'imgsZ=1024' for better resolution processing
    # Using 'conf=0.10' with 'agnostic_nms' to catch overlapping items
    project_path = os.path.join(BASE_DIR, 'static')
    results = model.predict(
        source=temp_download, 
        save=True, 
        project=project_path, 
        name='results', 
        exist_ok=True, 
        conf=0.10,        # Lower threshold to find more items
        imgsz=1024,       # Higher resolution for small items
        agnostic_nms=True # Better handling of overlapping boxes
    )
    
    detected_items = []
    for box in results[0].boxes:
        if int(box.cls) in target_classes:
            detected_items.append(box)
    
    vision_count = len(detected_items)
    
    # 3. PREPARE VALIDATED IMAGE
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    validated_filename = f"verified_{shop_id}_{timestamp}_{image_name}"
    local_proof_path = os.path.join(BASE_DIR, 'static', 'results', image_name)

    # 4. UPLOAD TO CLOUD ('validated images/' folder)
    cloud_proof_url = None
    try:
        print(f"DEBUG: Uploading verified image as {validated_filename}...")
        with open(local_proof_path, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=f"validated images/{validated_filename}",
                file=f,
                file_options={"content-type": "image/jpeg"}
            )
        
        # Get public URL
        cloud_proof_url = supabase.storage.from_(BUCKET_NAME).get_public_url(f"validated images/{validated_filename}")
    except Exception as e:
        print(f"ERROR: Cloud upload failed: {e}")

    # Log to local debug file
    with open("debug_vision.log", "a") as f:
        f.write(f"\n[{timestamp}] Shop: {shop_id}, Count: {vision_count}, URL: {cloud_proof_url}\n")

    return vision_count, cloud_proof_url
