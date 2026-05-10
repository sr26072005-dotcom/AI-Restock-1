import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def verify_system():
    print("--- 🚀 STARTING SYSTEM VERIFICATION ---")
    
    if not SUPABASE_URL or "your-project" in SUPABASE_URL:
        print("❌ ERROR: SUPABASE_URL not set correctly in .env")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase Client: Connected successfully.")
    except Exception as e:
        print(f"❌ Supabase Client: Connection failed: {e}")
        return

    # 1. Check Table: shops_inventory
    try:
        res = supabase.table("shops_inventory").select("*").limit(1).execute()
        print(f"✅ Table 'shops_inventory': Accessible ({len(res.data)} rows found).")
    except Exception as e:
        print(f"❌ Table 'shops_inventory': NOT FOUND or NOT ACCESSIBLE. (Did you run the SQL?) Error: {e}")

    # 2. Check Table: inventory_audits
    try:
        res = supabase.table("inventory_audits").select("*").limit(1).execute()
        print(f"✅ Table 'inventory_audits': Accessible.")
    except Exception as e:
        print(f"❌ Table 'inventory_audits': NOT FOUND or NOT ACCESSIBLE. Error: {e}")

    # 3. Check Storage: Details bucket
    try:
        # List buckets to see if ours exists
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if "Details" in bucket_names:
            print("✅ Storage Bucket 'Details': Found.")
            
            # Check for 'images/' folder content
            files = supabase.storage.from_("Details").list("images")
            print(f"✅ Folder 'images/': Accessible ({len(files)} files found).")
            for f in files:
                if f['name'] != '.emptyFolderPlaceholder':
                    print(f"   - Found image: {f['name']}")
        else:
            print(f"❌ Storage Bucket 'Details': NOT FOUND. (Actual buckets: {bucket_names})")
    except Exception as e:
        print(f"❌ Storage: Connection error: {e}")

    print("--- 🏁 VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    verify_system()
