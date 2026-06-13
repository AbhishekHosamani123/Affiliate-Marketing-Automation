import json
import os
from pathlib import Path
from urllib import parse, request


def load_dotenv(file_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not file_path.exists():
        return values

    for line in file_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


dotenv_values = load_dotenv(Path(__file__).with_name(".env"))
if not dotenv_values.get("TELEGRAM_BOT_TOKEN"):
    dotenv_values = load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BOT_TOKEN = dotenv_values.get("TELEGRAM_BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
CHANNEL_USERNAME = "@MofxvE487gowN2Y1"

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is not set in .env")

message = "🎉 Gaurangi Automation Test Successful!"

url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

payload = parse.urlencode({"chat_id": CHANNEL_USERNAME, "text": message}).encode("utf-8")
request_object = request.Request(url, data=payload, method="POST")

with request.urlopen(request_object, timeout=30) as response:
    print(response.read().decode("utf-8"))