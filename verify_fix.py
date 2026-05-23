import os
import sys

# Add backend to path so we can import vision_service
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from vision_service import analyze_shelf
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def test_audit():
    region = "Dindigul"
    shop_name = "Begampur Daily Needs" # This is a .webp file in Supabase
    
    print(f"Testing analyze_shelf for {shop_name} in {region}...")
    vision_count, cloud_proof_url = analyze_shelf(region, shop_name)
    
    print(f"Result: Count={vision_count}, Proof URL={cloud_proof_url}")

if __name__ == "__main__":
    test_audit()
