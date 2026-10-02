import os
import threading
import webbrowser

import uvicorn

from utils import load_env

HOST = os.environ.get("FLOWSOUND_HOST", "127.0.0.1")
PORT = int(os.environ.get("FLOWSOUND_PORT", "8765"))
URL = f"http://{HOST}:{PORT}"


def main():
    load_env()
    threading.Timer(1.5, lambda: webbrowser.open(URL)).start()
    uvicorn.run("server:app", host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
