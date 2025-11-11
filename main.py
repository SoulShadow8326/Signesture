import os
from pathlib import Path
import uvicorn
from routes import app

dist_dir = Path(__file__).resolve().parent / 'dist'


def run():
    host = os.environ.get("SIGN_HOST", "127.0.0.1")
    port = int(os.environ.get("SIGN_PORT", "8000"))
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run()