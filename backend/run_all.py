import subprocess
import time
import sys
import os

# Ensure we are working relative to the script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def run_project():
    print("--- 🚀 STARTING AI RESTOCK SYSTEM ---")

    # 1. Start Backend
    print("Backend: Initializing Flask API & AI Engine...")
    # Use the venv python if available, otherwise fallback to sys.executable
    venv_python = os.path.join(BASE_DIR, "venv", "Scripts", "python.exe")
    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    backend_process = subprocess.Popen(
        [python_exe, "app.py"],
        cwd=BASE_DIR
    )

    # 2. Wait for backend to stabilize
    time.sleep(3)

    # 3. Start Frontend
    print("Frontend: Launching Executive Dashboard...")
    frontend_process = subprocess.Popen(
        "npm start",
        shell=True,
        cwd=os.path.join(BASE_DIR, "frontend")
    )

    print("\n✅ SYSTEM ONLINE")
    print("Dashboard: http://localhost:3000")
    print("Backend API: http://localhost:5000")
    print("Press Ctrl+C in this terminal to shut down both systems.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n--- 🛑 SHUTTING DOWN SYSTEMS ---")
        backend_process.terminate()
        # Kill npm process tree on windows
        subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)])
        print("Done.")

if __name__ == "__main__":
    run_project()

