import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    buckets = supabase.storage.list_buckets()
    print("Buckets:")
    for b in buckets:
        print(f"- {b.name}")
except Exception as e:
    print(f"Error listing buckets: {e}")

try:
    # Try to list files in Dindigul folder of Audit_Proofs bucket if it exists
    # Based on user hint, it might be Audit_Proofs
    files = supabase.storage.from_("Audit_Proofs").list("Dindigul")
    print("\nFiles in Audit_Proofs/Dindigul:")
    for f in files:
        print(f"- {f['name']}")
except Exception as e:
    print(f"Error listing files in Audit_Proofs/Dindigul: {e}")
