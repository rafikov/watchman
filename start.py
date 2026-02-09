import subprocess
import sys
import time
import signal
import os
import webbrowser

processes = []

def cleanup(signum=None, frame=None):
    print("\nStopping servers...")
    for proc in processes:
        if proc.poll() is None:
            proc.terminate()
            proc.wait()
    sys.exit(0)

os.chdir(os.path.dirname(os.path.abspath(__file__)))

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

try:
    print("Starting S21 Watchman Environment...")
    
    proxy_proc = subprocess.Popen([sys.executable, "cors_proxy.py"])
    processes.append(proxy_proc)
    
    http_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000", "--bind", "127.0.0.1"],
        stdout=subprocess.DEVNULL, 
        stderr=subprocess.DEVNULL
    )
    processes.append(http_proc)
    
    print("-" * 48)
    print("Web Server: http://localhost:8000")
    print("CORS Proxy: http://localhost:8080")
    print("Press Ctrl+C to stop")
    print("-" * 48)
    
    time.sleep(1.5)
    webbrowser.open("http://localhost:8000")
    
    while True:
        time.sleep(1)
        
except KeyboardInterrupt:
    cleanup()