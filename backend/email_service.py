import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

def send_html_email(to_email, subject, html_content):
    """Sends a professional HTML email."""
    print(f"DEBUG: Attempting to send HTML email to {to_email}...")
    
    if not SMTP_USER or not SMTP_PASS:
        # FALLBACK: Log to file
        with open("notifications.log", "a") as f:
            f.write(f"\n[HTML EMAIL LOG] To: {to_email}\nSubject: {subject}\nContent: {html_content[:200]}...\n{'-'*30}\n")
        print(f"INFO: SMTP not configured. Logged HTML email to 'notifications.log'")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = f"AI Inventory Auditor <{SMTP_USER}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        return False

def generate_report_template(shop_name, status, details, proof_url=None):
    """Creates a professional HTML email template."""
    bg_color = "#f4f7f6"
    header_color = "#2c3e50"
    status_color = "#27ae60" # Default Green (Success)
    
    if "Critical" in status or "Phantom" in status: status_color = "#e74c3c" # Red
    elif "Warning" in status or "Low" in status: status_color = "#f39c12" # Orange
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    proof_section = ""
    if proof_url:
        proof_section = f"""
        <div style="margin-top: 30px; text-align: center; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
            <p style="margin-bottom: 15px; font-weight: bold; color: #34495e;">AI Verification Proof:</p>
            <a href="{proof_url}" target="_blank">
                <img src="{proof_url}" alt="AI Vision Proof" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #eee;">
            </a>
            <p style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">(Click image to view full resolution)</p>
        </div>
        """

    return f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: {bg_color}; padding: 20px; color: #2c3e50;">
        <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="background-color: {header_color}; color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">AI Inventory Management</h1>
                <p style="margin: 8px 0 0; font-size: 15px; opacity: 0.9;">Audit Verification Report</p>
            </div>
            
            <!-- Status Banner -->
            <div style="background-color: {status_color}; color: white; padding: 12px; text-align: center; font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                {status}
            </div>
            
            <!-- Content -->
            <div style="padding: 40px; line-height: 1.6;">
                <p style="font-size: 16px;">Dear <strong>Store Manager</strong>,</p>
                <p>The AI Vision Audit for <strong>{shop_name}</strong> has been processed and finalized. Below are the comprehensive details of the assessment and subsequent inventory allocation.</p>
                
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        {details}
                    </table>
                </div>

                {proof_section}

                <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #edf2f7; font-size: 13px; color: #95a5a6; text-align: center;">
                    <p><strong>Verification ID:</strong> {timestamp.replace(' ', '-').replace(':', '')}</p>
                    <p><strong>Timestamp:</strong> {timestamp}</p>
                    <p style="margin-top: 15px;">&copy; 2026 AI Restock Systems. All rights reserved.</p>
                    <p>This is an automated system notification. Please do not reply directly to this address.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def notify_audit_finalized(shop_name, shop_email, data):
    """
    Sends a professional finalized audit report.
    data = {
        'product': '...',
        'billing_count': 10,
        'vision_count': 2,
        'restock_qty': 8,
        'payment_method': 'COD',
        'amount': 1500.00,
        'proof_url': '...'
    }
    """
    subject = f"✅ FINALIZED AUDIT & RESTOCK: {shop_name}"
    
    # Calculate status based on vision
    status_label = "Success (Restock Allocated)"
    if data.get('vision_count', 0) < 5:
        status_label = "Warning (Critical Low Stock)"

    details = f"""
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Product Name</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 600;">{data['product']}</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Target Inventory</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right;">{data['billing_count']} units</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Quantity to Restock</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 600; color: #27ae60;">+{data['restock_qty']} units</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Payment Mode</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right;">{data['payment_method']}</td></tr>
    <tr><td style="padding: 12px 0; color: #2c3e50; font-weight: bold; font-size: 16px;">Total Order Amount</td><td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #27ae60;">₹{data['amount']:,.2f}</td></tr>
    """
    
    html = generate_report_template(shop_name, status_label, details, data.get('proof_url'))
    return send_html_email(shop_email, subject, html)

def notify_phantom_stock(shop_name, shop_email, data):
    """
    Sends a detailed critical report for Phantom Stock.
    data = {'product': '...', 'billing_count': 10, 'vision_count': 2, 'variance': -8, 'proof_url': '...'}
    """
    subject = f"🚨 PHANTOM STOCK ALERT: {shop_name}"
    
    details = f"""
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Product</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 600;">{data['product']}</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Billing Inventory</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right;">{data['billing_count']} units</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">AI Shelf Count</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 600; color: #e74c3c;">{data['vision_count']} units</td></tr>
    <tr><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #7f8c8d;">Inventory Leakage</td><td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: 600; color: #e74c3c;">{data['variance']} units (Missing)</td></tr>
    <tr><td style="padding: 12px 0; color: #7f8c8d;">Action Required</td><td style="padding: 12px 0; text-align: right; color: #c0392b; font-weight: 600;">Immediate Shelf Verification Required</td></tr>
    """
    
    html = generate_report_template(shop_name, "Critical (Phantom Stock Detected)", details, data.get('proof_url'))
    return send_html_email(shop_email, subject, html)

def notify_restock_allocated(shop_name, shop_email, product, qty, data):
    """
    Sends a restock approval report.
    data = {'vision_count': 2, 'proof_url': '...'}
    """
    subject = f"📦 RESTOCK ALLOCATED: {product} for {shop_name}"
    
    details = f"""
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Product</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{product}</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>AI Visual Count</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{data['vision_count']} units</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Allocation Quantity</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #4CAF50; font-weight: bold;">+{qty} units</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Status</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">Order processed. Delivery expected in 24-48 hours.</td></tr>
    """
    
    html = generate_report_template(shop_name, "Warning (Low Stock)", details, data.get('proof_url'))
    return send_html_email(shop_email, subject, html)

def notify_audit_started(region, product):
    """Simple notification that the process has begun."""
    recipient = "sr26072005@gmail.com"
    subject = f"🚀 AUDIT INITIATED: {region} ({product})"
    
    body = f"""
    <h2>Region Audit Started</h2>
    <p>A full AI vision sweep has been initiated for <b>{region}</b> regarding the product: <b>{product}</b>.</p>
    <p>Detailed reports will be sent to individual store managers upon completion.</p>
    """
    return send_html_email(recipient, subject, body)
