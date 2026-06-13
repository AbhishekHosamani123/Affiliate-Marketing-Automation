from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
    load_dotenv(BASE_DIR.parent / ".env")
except ImportError:
    pass

IG_USER_ID = os.getenv("IG_USER_ID")
ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
