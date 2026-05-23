import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("--- DB Stores (Dindigul) ---")
res = supabase.table('stores').select('name').eq('region', 'Dindigul').execute()
db_names = [r['name'] for r in res.data]
for name in db_names:
    print(f"- '{name}'")

print("\n--- Supabase Files (Audit_Proofs/Dindigul) ---")
files = supabase.storage.from_("Audit_Proofs").list("Dindigul")
storage_names = [f['name'] for f in files]
for name in storage_names:
    print(f"- '{name}'")

print("\n--- Match Results ---")
for db_n in db_names:
    found = False
    clean_db = db_n.strip().lower()
    for st_n in storage_names:
        clean_st = os.path.splitext(st_n)[0].strip().lower()
        if clean_db == clean_st:
            print(f"✅ MATCH: '{db_n}' -> '{st_n}'")
            found = True
            break
    if not found:
        print(f"❌ MISSING: '{db_n}'")
