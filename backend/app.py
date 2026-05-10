from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

from vision_service import analyze_shelf
from email_service import notify_phantom_stock, notify_restock_allocated, notify_audit_started

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/api/audit', methods=['POST'])
def perform_audit_scan():
    """
    STEP 1: INITIALIZE & SCAN
    Sends 'Audit Started' email and runs AI vision.
    """
    data = request.json
    region = data.get('region')
    product = data.get('product')

    # 1. Trigger 'Audit Started' Notification
    notify_audit_started(region, product)

    # 2. Fetch Master Billing Data
    try:
        query = supabase.table("shops_inventory").select("*").eq("region", region).eq("product", product).execute()
        regional_shops = query.data
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500
    
    scan_results = []
    for shop in regional_shops:
        image_name = shop.get('shelf_image_name', 'test_shelf.jpg')
        
        # 3. AI Vision Process
        vision_count, cloud_proof_url = analyze_shelf(image_name, shop['shop_id'])

        # 4. Preliminary Business Logic
        variance = vision_count - shop['billing_count']
        
        # Default suggested status
        status = "Healthy"
        if abs(variance) > 5: status = "Phantom Stock"
        elif vision_count <= shop['min_threshold']: status = "Need Stock"
        elif vision_count > 20: status = "Stock Full"

        scan_results.append({
            "shop_id": shop['shop_id'],
            "shop_name": shop['shop_name'],
            "region": shop['region'],
            "product": shop['product'],
            "billing_count": shop['billing_count'],
            "vision_count": int(vision_count),
            "variance": int(variance),
            "status": status,
            "proof_url": cloud_proof_url,
            "payment_method": shop.get('payment_method', 'Net Banking'),
            "min_threshold": shop['min_threshold'],
            "restock_qty": shop['default_restock_qty'],
            "manager_email": shop.get('manager_email', 'sr26072005@gmail.com'),
            "selected": status == "Need Stock" # Auto-select shops that actually need stock
        })

    return jsonify({"status": "SUCCESS", "results": scan_results})

@app.route('/api/finalize', methods=['POST'])
def finalize_orders():
    """
    STEP 4: EXECUTE & ALLOCATE
    Only processes shops selected by the user.
    """
    data = request.json
    selected_shops = data.get('audit_data', [])
    
    for entry in selected_shops:
        # 1. Log the final verified audit to Cloud DB
        audit_log = {
            "shop_name": entry['shop_name'],
            "region": entry['region'],
            "product": entry['product'],
            "billing_count": entry['billing_count'],
            "vision_count": entry['vision_count'],
            "variance": entry['variance'],
            "status": entry['status'],
            "action_taken": f"Restock of {entry['restock_qty']} units allocated via {entry['payment_method']}",
            "proof_url": entry['proof_url'],
            "payment_method": entry['payment_method']
        }
        supabase.table("inventory_audits").insert(audit_log).execute()

        # 2. Trigger 'Restock Allocated' Notification
        notify_restock_allocated(entry['shop_name'], entry['manager_email'], entry['product'], entry['restock_qty'], entry)

    return jsonify({"status": "SUCCESS", "message": "Finalized. Restock emails sent."})

@app.route('/api/history', methods=['GET'])
def get_history():
    res = supabase.table("inventory_audits").select("*").order("timestamp", desc=True).limit(50).execute()
    return jsonify(res.data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
