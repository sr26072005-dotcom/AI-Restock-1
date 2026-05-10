# AI RESTOCK MANAGER - Project Report

## 1. Project Overview
The **AI RESTOCK MANAGER** is an advanced inventory management and shelf auditing system that leverages Artificial Intelligence (AI) to automate the process of stock verification and replenishment. Designed for retail and supply chain environments, the system uses computer vision to analyze shelf images, detect stock levels, identify "Phantom Stock" (discrepancies between digital records and physical shelf reality), and automate restock orders.

---

## 2. Objectives
- **Automate Auditing:** Eliminate manual shelf counting by using AI vision.
- **Identify Phantom Stock:** Detect discrepancies where system inventory shows stock, but the shelf is empty (theft, misplacement, or unrecorded sales).
- **Streamline Replenishment:** Automatically suggest and execute restock orders based on visual proof.
- **Enhance Communication:** Provide automated, professional audit reports and restock notifications to store managers.
- **Visual Verification:** Maintain a cloud-based history of visual proof for every audit and action taken.

---

## 3. System Architecture
The system follows a modern full-stack architecture with a focus on AI integration:

- **Frontend:** A React-based executive dashboard for managers to trigger audits, validate AI findings, and finalize restock orders.
- **Backend:** A Flask (Python) API that orchestrates the AI vision engine, database interactions, and notification services.
- **AI Engine:** Powered by YOLOv8 (You Only Look Once) for real-time object detection and shelf analysis.
- **Cloud Infrastructure:** Uses Supabase for PostgreSQL database, Cloud Storage (for images), and Authentication.
- **Notification Layer:** SMTP-based email service for sending professional HTML audit reports.

---

## 4. Tech Stack

### Frontend
- **Framework:** React 19
- **State Management:** React Hooks (useState, useEffect)
- **API Client:** Axios
- **Styling:** Vanilla CSS (Modern, Responsive UI)

### Backend
- **Language:** Python 3.x
- **Framework:** Flask
- **AI/ML:** Ultralytics YOLOv8, OpenCV
- **Database:** Supabase (PostgreSQL)
- **Cloud Storage:** Supabase Storage (Buckets)
- **Environment:** python-dotenv

### DevOps & Tools
- **Version Control:** Git
- **Dependency Management:** pip (Python), npm (Node.js)
- **SMTP:** Gmail/Custom SMTP for notifications

---

## 5. Implementation Approach & Workflow

### Step 1: Initialize & Scan (The AI Audit)
The manager selects a region and product. The system:
1. Triggers an "Audit Started" notification.
2. Fetches current system inventory data from Supabase.
3. Downloads the latest shelf images from cloud storage.
4. **AI Analysis:** Runs YOLOv8 models on the images to count physical items.
5. Calculates **Variance**: `AI Count - System Count`.

### Step 2: Validation
The dashboard displays the AI results alongside system data.
- **Phantom Stock:** Flagged if variance is high (Missing items).
- **Need Stock:** Flagged if AI count is below a pre-set threshold.
- **Healthy/Full:** Flagged if levels are optimal.

### Step 3: Refinement
Managers can manually adjust suggested restock quantities and select payment methods (Net Banking, Paid, UPI). This ensures human-in-the-loop oversight for the AI system.

### Step 4: Finalize & Execute
Upon final approval:
1. **Audit Logs:** Final verified data is saved to the `inventory_audits` table in Supabase.
2. **Visual Proof:** The AI-annotated "Verified Image" is uploaded to the cloud and linked to the record.
3. **Automated Notifications:** Store managers receive detailed HTML emails with the audit results and a link to view the visual proof.

---

## 6. Key Features
- **AI Vision Accuracy:** Uses high-resolution processing (1024px) and agnostic NMS for precise counting of overlapping items.
- **Professional Reporting:** Automated HTML email templates with dynamic color-coding based on audit status (Critical/Warning/Success).
- **Cloud-Native Storage:** Seamless integration with Supabase for persistent data and image hosting.
- **Executive Dashboard:** A clean, 4-step wizard interface that simplifies complex AI operations into a user-friendly workflow.
- **Debugging & Logging:** Robust logging system for tracking AI performance and notification delivery.

---

## 7. Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js & npm
- Supabase Account (with URL/Key)
- SMTP Credentials (for emails)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AI-restock-system
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Create a .env file with SUPABASE_URL, SUPABASE_KEY, SMTP_USER, SMTP_PASS
   ```

3. **Frontend Setup:**
   ```bash
   cd ui
   npm install
   ```

4. **Run the System:**
   From the root directory:
   ```bash
   python backend/run_all.py
   ```

---

*This project represents a fusion of computer vision and business intelligence to solve real-world retail challenges.*
