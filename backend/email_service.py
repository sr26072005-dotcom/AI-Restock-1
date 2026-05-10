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
    bg_color = "#f4f4f4"
    header_color = "#333333"
    status_color = "#4CAF50" # Default Green
    
    if "Critical" in status: status_color = "#d9534f" # Red
    elif "Warning" in status: status_color = "#f0ad4e" # Orange
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    proof_section = ""
    if proof_url:
        proof_section = f"""
        <div style="margin-top: 20px; text-align: center;">
            <a href="{proof_url}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Visual AI Proof</a>
        </div>
        """

    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: {bg_color}; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background-color: {header_color}; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">AI Inventory Audit Report</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Verification for {shop_name}</p>
            </div>
            
            <!-- Status Banner -->
            <div style="background-color: {status_color}; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 18px;">
                Status: {status}
            </div>
            
            <!-- Content -->
            <div style="padding: 30px; color: #444444; line-height: 1.6;">
                <p>Hello Store Manager,</p>
                <p>Our automated AI vision system has completed the shelf audit for your location. Below are the finalized details:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    {details}
                </table>

                {proof_section}

                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #888;">
                    <p><strong>Audit Timestamp:</strong> {timestamp}</p>
                    <p>This is an automated report from the AI Restock System. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def notify_phantom_stock(shop_name, shop_email, data):
    """
    Sends a detailed critical report for Phantom Stock.
    data = {'product': '...', 'billing_count': 10, 'vision_count': 2, 'variance': -8}
    """
    subject = f"⚠️ CRITICAL: Phantom Stock Detected at {shop_name}"
    
    details = f"""
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Product</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">{data['product']}</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>System Count (Billing)</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #007bff;">{data['billing_count']} units</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>AI Visual Count</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #d9534f;">{data['vision_count']} units</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Inventory Variance</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #d9534f;">{data['variance']} (Missing)</td></tr>
    <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Required Action</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">Immediate manual shelf check for theft or misplacement.</td></tr>
    """
    
    html = generate_report_template(shop_name, "Critical (Phantom Stock)", details, data.get('proof_url'))
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
