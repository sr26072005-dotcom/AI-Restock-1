import os
import datetime
import mimetypes
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

# Model configuration: Using the custom trained best.pt model
model_path = os.path.join(BASE_DIR, 'best.pt') 
model = YOLO(model_path) 

# Storage Bucket configuration
BUCKET_NAME = "Audit_Proofs"

def analyze_shelf(region, shop_name, target_classes=None):
    """
    1. Downloads image from Supabase 'Audit_Proofs' bucket using path: [region]/[shop_name].[extension]
    2. Runs custom YOLO AI detection (best.pt).
    3. Uploads verified image to Supabase 'Audit_Proofs' bucket under 'validated/' folder.
    4. Returns vision count and the public cloud URL.
    """
    if target_classes is None:
        target_classes = [0] # Default to the trained class (e.g., Dove)

    # 1. FIND AND DOWNLOAD FROM CLOUD
    # Dynamic extension handling: list files in the region folder to find the matching shop_name
    image_filename = None
    cloud_path = None
    try:
        print(f"DEBUG: Searching for '{shop_name}' in bucket '{BUCKET_NAME}', region '{region}'...")
        files = supabase.storage.from_(BUCKET_NAME).list(region)
        
        # Robust matching: strip and lower case
        target_name = shop_name.strip().lower()
        for f in files:
            name_without_ext = os.path.splitext(f['name'])[0].strip().lower()
            if name_without_ext == target_name:
                image_filename = f['name']
                cloud_path = f"{region}/{image_filename}"
                print(f"DEBUG: Found match in cloud: {cloud_path}")
                break
        
        if not image_filename:
            print(f"ERROR: Image for '{shop_name}' not found in {BUCKET_NAME}/{region}. Available files: {[f['name'] for f in files]}")
            return 0, None

        print(f"DEBUG: Downloading {cloud_path} from Supabase Storage...")
        res = supabase.storage.from_(BUCKET_NAME).download(cloud_path)
        
        # Create local temp paths
        temp_download = os.path.join(BASE_DIR, 'static', 'uploads', f"{region}_{image_filename}")
        os.makedirs(os.path.dirname(temp_download), exist_ok=True)
        
        with open(temp_download, "wb") as f:
            f.write(res)
        print(f"DEBUG: Successfully downloaded to {temp_download}")
    except Exception as e:
        print(f"ERROR: Cloud download failed for {shop_name} in {region}: {e}")
        return 0, None

    # 2. AI ANALYSIS
    try:
        print(f"DEBUG: Running YOLO AI on {temp_download}...")
        project_path = os.path.join(BASE_DIR, 'static')
        results = model.predict(
            source=temp_download, 
            save=True, 
            project=project_path, 
            name='results', 
            exist_ok=True, 
            conf=0.10,        # Keep the previously set high-sensitivity settings
            imgsz=1024,
            agnostic_nms=True
        )
        print(f"DEBUG: YOLO detection complete.")
    except Exception as e:
        print(f"ERROR: AI Prediction failed: {e}")
        return 0, None
    
    detected_items = []
    # Check if we have OBB (as expected from best.pt) or standard boxes
    if results[0].obb is not None:
        for obb in results[0].obb:
            if int(obb.cls) in target_classes:
                detected_items.append(obb)
    elif results[0].boxes is not None:
        for box in results[0].boxes:
            if int(box.cls) in target_classes:
                detected_items.append(box)
    
    vision_count = len(detected_items)
    print(f"DEBUG: Detected {vision_count} items.")
    
    # 3. PREPARE VALIDATED IMAGE
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    validated_filename = f"verified_{timestamp}_{image_filename}"
    local_proof_path = os.path.join(BASE_DIR, 'static', 'results', f"{region}_{image_filename}")
    
    if not os.path.exists(local_proof_path):
        # Fallback: YOLO might have saved it with a different extension or name if it was converted
        # Usually it keeps the name, but let's check
        print(f"WARNING: Expected result image at {local_proof_path} not found. Checking directory...")
        res_dir = os.path.dirname(local_proof_path)
        possible_files = [f for f in os.listdir(res_dir) if f.startswith(f"{region}_{os.path.splitext(image_filename)[0]}")]
        if possible_files:
            local_proof_path = os.path.join(res_dir, possible_files[0])
            print(f"DEBUG: Found alternate result image at {local_proof_path}")

    # 4. UPLOAD TO CLOUD ('validated/' folder in same bucket)
    cloud_proof_url = None
    try:
        if os.path.exists(local_proof_path):
            print(f"DEBUG: Uploading verified image as {validated_filename}...")
            cloud_upload_path = f"validated/{region}/{validated_filename}"
            
            # Determine content type
            content_type, _ = mimetypes.guess_type(local_proof_path)
            if not content_type:
                content_type = "image/jpeg" # Fallback
                
            with open(local_proof_path, "rb") as f:
                supabase.storage.from_(BUCKET_NAME).upload(
                    path=cloud_upload_path,
                    file=f,
                    file_options={"content-type": content_type}
                )
            
            # Get public URL
            cloud_proof_url = supabase.storage.from_(BUCKET_NAME).get_public_url(cloud_upload_path)
            print(f"DEBUG: Upload complete. Public URL: {cloud_proof_url}")
        else:
            print(f"ERROR: Local proof image NOT FOUND at {local_proof_path}, skipping upload.")
    except Exception as e:
        print(f"ERROR: Cloud upload failed: {e}")

    return vision_count, cloud_proof_url
