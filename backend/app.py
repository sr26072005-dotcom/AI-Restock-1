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
from email_service import send_html_email, notify_audit_started

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/api/audit', methods=['POST'])
def perform_audit_scan():
    """STAGE 1 & 2: INITIALIZE & SCAN"""
    if not supabase:
        return jsonify({"status": "ERROR", "message": "Supabase not configured"}), 500

    data = request.json
    region = data.get('region')      
    product_sku = data.get('product') 

    try:
        prod_res = supabase.table("products").select("*").eq("sku", product_sku).execute()
        if not prod_res.data:
            return jsonify({"status": "ERROR", "message": f"Product SKU {product_sku} not found"}), 404
        product_info = prod_res.data[0]
        product_name = product_info['product_name']
        
        target_classes = [0]
        if "Lux" in product_name: target_classes = [1]
        elif "Pears" in product_name: target_classes = [2]
    except Exception as e:
        return jsonify({"status": "ERROR", "message": f"Product query failed: {e}"}), 500

    try:
        stores_res = supabase.table("stores").select("*").eq("region", region).execute()
        regional_stores = stores_res.data
        if not regional_stores:
            return jsonify({"status": "SUCCESS", "results": [], "message": "No stores found"}), 200

        for s in regional_stores:
            if s.get('email'):
                subject = f"🚀 AUDIT INITIATED: {s['name']} ({product_name})"
                body = f"<h2>Audit Started</h2><p>AI sweep for <b>{product_name}</b> started.</p>"
                send_html_email(s['email'], subject, body)
        notify_audit_started(region, product_name)
    except Exception as e:
        print(f"ERROR: Stage 1 Email failed: {e}")

    scan_results = []
    for store in regional_stores:
        shop_name = store['name']
        expected_count = 0
        try:
            bill_res = supabase.table("store_bill_counts").select("expected_bill_count").eq("store_id", store['id']).eq("product_sku", product_sku).execute()
            if bill_res.data:
                expected_count = bill_res.data[0]['expected_bill_count']
        except Exception as e:
            print(f"DEBUG: Failed to fetch bill count: {e}")

        # Default to 20 if count is missing or 0 as per user requirement
        if expected_count == 0:
            expected_count = 20

        try:
            vision_count, cloud_proof_url = analyze_shelf(region, shop_name, target_classes)
        except Exception as e:
            print(f"ERROR: AI Vision failed: {e}")
            vision_count, cloud_proof_url = 0, None

        variance = vision_count - expected_count
        status = "good"
        if variance < -5: status = "phantom"
        elif vision_count < 10: status = "bad"
        elif vision_count < 20: status = "medium"

        scan_results.append({
            "store_id": store['id'],
            "store_name": shop_name,
            "region": region,
            "product_sku": product_sku,
            "product_name": product_name,
            "billing_count": expected_count,
            "vision_count": int(vision_count),
            "variance": int(variance),
            "status": status,
            "proof_url": cloud_proof_url,
            "payment_method": "COD", 
            "manager_email": store.get('email'),
            "selected": True
        })

    return jsonify({"status": "SUCCESS", "results": scan_results})

@app.route('/api/finalize', methods=['POST'])
def finalize_orders():
    """STAGE 3: EXECUTE & ALLOCATE"""
    if not supabase: return jsonify({"status": "ERROR"}), 500
    data = request.json
    selected_items = data.get('audit_data', [])
    from email_service import notify_audit_finalized, notify_phantom_stock

    for entry in selected_items:
        try:
            # Fetch product details for amount calculation and inventory deduction
            prod_res = supabase.table("products").select("price, product_name, in_stock_count").eq("sku", entry['product_sku']).execute()
            
            if not prod_res.data:
                print(f"ERROR: Product {entry['product_sku']} not found during finalization.")
                continue
                
            product_data = prod_res.data[0]
            price = product_data.get('price', 0)
            product_name = product_data.get('product_name', 'Product')
            current_stock = product_data.get('in_stock_count', 0)

            # Get restock quantity from frontend override or calculate default
            restock_qty = entry.get('restock_qty', max(0, entry['billing_count'] - entry['vision_count']))
            total_amount = restock_qty * price

            # Deduct from global inventory
            new_stock = max(0, current_stock - restock_qty)
            supabase.table("products").update({"in_stock_count": new_stock}).eq("sku", entry['product_sku']).execute()
            print(f"DEBUG: Deducted {restock_qty} from {product_name} inventory. New stock: {new_stock}")

            insert_data = {
                "store_id": entry['store_id'],
                "product_sku": entry['product_sku'],
                "bill_count": entry['billing_count'],
                "yolo_detected_count": entry['vision_count'],
                "payment_method": entry.get('payment_method', 'COD'),
                "proof_image_path": entry['proof_url'] if entry['proof_url'] else "N/A",
                "status": "Pending Restock"
            }
            res = supabase.table("final_restock_results").insert(insert_data).execute()
            
            if entry.get('manager_email'):
                # Send professional finalized email
                email_data = {
                    'product': product_name,
                    'billing_count': entry['billing_count'],
                    'vision_count': entry['vision_count'],
                    'restock_qty': restock_qty,
                    'payment_method': entry.get('payment_method', 'COD'),
                    'amount': float(total_amount),
                    'proof_url': entry['proof_url']
                }
                notify_audit_finalized(entry['store_name'], entry['manager_email'], email_data)

                # If phantom stock, send separate alert to admin
                if entry.get('status') == 'phantom' or entry.get('variance', 0) < -5:
                    phantom_data = {
                        'product': product_name,
                        'billing_count': entry['billing_count'],
                        'vision_count': entry['vision_count'],
                        'variance': entry['variance'],
                        'proof_url': entry['proof_url']
                    }
                    notify_phantom_stock(entry['store_name'], "sr26072005@gmail.com", phantom_data)

        except Exception as e: 
            print(f"ERROR: Finalize failed for {entry.get('store_name')}: {e}")
            
    return jsonify({"status": "SUCCESS"})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Stats for Executive Dashboard: Total Customers and Total Stock Value"""
    try:
        # Total Customers (Store Count)
        stores_res = supabase.table("stores").select("id", count="exact").execute()
        total_customers = stores_res.count if stores_res.count is not None else 0
        
        # Total Stock Value (Sum of price * in_stock_count)
        products_res = supabase.table("products").select("price, in_stock_count").execute()
        total_stock_value = sum([float(p['price'] or 0) * int(p['in_stock_count'] or 0) for p in products_res.data]) if products_res.data else 0
        
        return jsonify({
            "total_customers": total_customers,
            "total_stock_value": total_stock_value
        })
    except Exception as e:
        print(f"ERROR: Dashboard stats failed: {e}")
        return jsonify({"total_customers": 0, "total_stock_value": 0})

@app.route('/api/dashboard/expected-bills', methods=['GET'])
def get_expected_bills_by_region():
    """Fetch expected bill counts aggregated by store for a region"""
    region = request.args.get('region')
    if not region:
        return jsonify([])
    
    try:
        # Get stores in region
        stores_res = supabase.table("stores").select("id, name").eq("region", region).execute()
        if not stores_res.data:
            return jsonify([])
        
        store_ids = [s['id'] for s in stores_res.data]
        store_map = {s['id']: s['name'] for s in stores_res.data}
        
        # Get bill counts for these stores
        bill_res = supabase.table("store_bill_counts").select("store_id, expected_bill_count").in_("store_id", store_ids).execute()
        
        # Aggregate by store
        aggregated = {}
        for row in bill_res.data:
            sid = row['store_id']
            count = row['expected_bill_count']
            aggregated[sid] = aggregated.get(sid, 0) + count
            
        result = [
            {"name": store_map[sid], "expected_count": count}
            for sid, count in aggregated.items()
        ]
        return jsonify(result)
    except Exception as e:
        print(f"ERROR: Failed to fetch expected bills: {e}")
        return jsonify([])

@app.route('/api/history', methods=['GET'])
def get_history():
    """History from final_restock_results joined with stores and products"""
    try:
        res = supabase.table("final_restock_results").select("*, stores(name, region), products(product_name)").order("calculated_at", desc=True).limit(50).execute()
        return jsonify(res.data)
    except:
        return jsonify([])

@app.route('/api/stores', methods=['GET', 'POST', 'PATCH'])
def manage_stores():
    if request.method == 'GET':
        res = supabase.table("stores").select("*").execute()
        return jsonify(res.data)
    elif request.method == 'POST':
        res = supabase.table("stores").insert(request.json).execute()
        return jsonify(res.data)
    elif request.method == 'PATCH':
        data = request.json
        store_id = data.get('id')
        res = supabase.table("stores").update(data).eq("id", store_id).execute()
        return jsonify(res.data)
    return jsonify([])

@app.route('/api/stores/<store_id>', methods=['DELETE'])
def delete_store(store_id):
    try:
        supabase.table("stores").delete().eq("id", store_id).execute()
        return jsonify({"status": "SUCCESS"})
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500

@app.route('/api/products', methods=['GET', 'POST', 'PATCH'])
def manage_products():
    if request.method == 'GET':
        res = supabase.table("products").select("*").execute()
        return jsonify(res.data)
    elif request.method == 'POST':
        res = supabase.table("products").insert(request.json).execute()
        return jsonify(res.data)
    elif request.method == 'PATCH':
        data = request.json
        sku = data.get('sku')
        res = supabase.table("products").update(data).eq("sku", sku).execute()
        return jsonify(res.data)
    return jsonify([])

@app.route('/api/products/<sku>', methods=['DELETE'])
def delete_product(sku):
    try:
        supabase.table("products").delete().eq("sku", sku).execute()
        return jsonify({"status": "SUCCESS"})
    except Exception as e:
        return jsonify({"status": "ERROR", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
