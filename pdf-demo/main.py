import webview
import sys
import os

def get_base_path():
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return base_path

if __name__ == '__main__':
    HTML_FILE = os.path.join(get_base_path(), 'index.html')
    
    # Create a nice window for our tool
    webview.create_window(
        'PDF Utility Hub', 
        url=HTML_FILE,
        width=1200, 
        height=800,
        min_size=(800, 600)
    )
    
    # Start the app
    # In pywebview, starting without a local http server will use file:// 
    # which is completely fine for our local app since scripts are in the same dir
    webview.start()
