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

supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"CRITICAL: Failed to initialize Supabase client: {e}")
else:
    print("WARNING: Supabase credentials missing. Database features will fail.")

from vision_service import analyze_shelf
from email_service import notify_phantom_stock, notify_restock_allocated, notify_audit_started

app = Flask(__name__, static_folder='static')
CORS(app)

# Local Fallback Store
MEMORY_PRODUCTS = [{"name": "Dove Soap", "category": "Personal Care", "detection_id": 39}]

@app.route('/api/audit', methods=['POST'])
def perform_audit_scan():
    """
    STEP 1: INITIALIZE & SCAN
    Sends 'Audit Started' email and runs AI vision.
    """
    if not supabase:
        return jsonify({"status": "ERROR", "message": "Supabase not configured"}), 500

    data = request.json
    region = data.get('region')
    product = data.get('product')

    # 1. Trigger 'Audit Started' Notification
    try:
        notify_audit_started(region, product)
    except Exception as e:
        print(f"ERROR: Failed to send audit started notification: {e}")

    # 2. Fetch Master Billing Data
    try:
        # Fetch Target Product Detection ID
        target_classes = [39] # Default to bottle
        try:
            prod_query = supabase.table("products_catalog").select("detection_id").eq("name", product).execute()
            if prod_query.data:
                target_classes = [prod_query.data[0]['detection_id']]
        except Exception as e:
            print(f"DEBUG: Product catalog query failed: {e}. Using default classes.")

        query = supabase.table("shops_inventory").select("*").eq("region", region).eq("product", product).execute()
        regional_shops = query.data
    except Exception as e:
        return jsonify({"status": "ERROR", "message": f"Database query failed: {str(e)}"}), 500
    
    scan_results = []
    for shop in regional_shops:
        image_name = shop.get('shelf_image_name', 'test_shelf.jpg')
        
        # 3. AI Vision Process
        try:
            vision_count, cloud_proof_url = analyze_shelf(image_name, shop['shop_id'], target_classes)
        except Exception as e:
            print(f"ERROR: AI Vision failed for shop {shop['shop_id']}: {e}")
            vision_count, cloud_proof_url = 0, None

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
    if not supabase:
        return jsonify({"status": "ERROR", "message": "Supabase not configured"}), 500

    data = request.json
    selected_shops = data.get('audit_data', [])
    
    for entry in selected_shops:
        try:
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
        except Exception as e:
            print(f"ERROR: Finalize failed for shop {entry.get('shop_name')}: {e}")

    return jsonify({"status": "SUCCESS", "message": "Finalized. Restock emails sent."})

@app.route('/api/history', methods=['GET'])
def get_history():
    if not supabase:
        return jsonify([])
    try:
        res = supabase.table("inventory_audits").select("*").order("timestamp", desc=True).limit(50).execute()
        return jsonify(res.data)
    except Exception as e:
        print(f"ERROR: History fetch failed: {e}")
        return jsonify([])

@app.route('/api/shops', methods=['GET', 'POST'])
def manage_shops():
    if not supabase:
        return jsonify([]) if request.method == 'GET' else jsonify({"status": "ERROR", "message": "Supabase not configured"}), 500

    if request.method == 'GET':
        try:
            res = supabase.table("shops_inventory").select("*").execute()
            return jsonify(res.data)
        except Exception as e:
            print(f"ERROR: Shops fetch failed: {e}")
            return jsonify([])
    
    if request.method == 'POST':
        try:
            data = request.json
            # Add a default shop_id if not provided
            if 'shop_id' not in data:
                import uuid
                data['shop_id'] = f"SHOP-{str(uuid.uuid4())[:8].upper()}"
            
            res = supabase.table("shops_inventory").insert(data).execute()
            return jsonify({"status": "SUCCESS", "data": res.data})
        except Exception as e:
            return jsonify({"status": "ERROR", "message": str(e)}), 500

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    # Use global to modify the list in POST
    global MEMORY_PRODUCTS

    if request.method == 'GET':
        if supabase:
            try:
                res = supabase.table("products_catalog").select("*").execute()
                if res.data:
                    return jsonify(res.data)
            except Exception as e:
                print(f"DEBUG: Supabase products fetch failed: {e}")
        
        # Fallback to local memory
        return jsonify(MEMORY_PRODUCTS)
    
    if request.method == 'POST':
        data = request.json
        if supabase:
            try:
                res = supabase.table("products_catalog").insert(data).execute()
                if res.data:
                    return jsonify({"status": "SUCCESS", "data": res.data})
            except Exception as e:
                print(f"DEBUG: Supabase products insert failed: {e}")
        
        # Fallback to local memory
        MEMORY_PRODUCTS.append(data)
        return jsonify({"status": "SUCCESS", "message": "Saved to local memory", "data": [data]})

@app.route('/api/shops/<shop_id>', methods=['DELETE'])
def delete_shop(shop_id):
    try:
        supabase.table("shops_inventory").delete().eq("shop_id", shop_id).execute()
        return jsonify({"status": "SUCCESS", "message": f"Shop {shop_id} deleted."})
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500

@app.route('/api/products/<product_name>', methods=['DELETE'])
def delete_product(product_name):
    try:
        supabase.table("products_catalog").delete().eq("name", product_name).execute()
        return jsonify({"status": "SUCCESS", "message": f"Product {product_name} deleted."})
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
