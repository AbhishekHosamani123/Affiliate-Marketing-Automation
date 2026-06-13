import argparse
import json
import os
from pathlib import Path
import sys
import csv
import requests

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
CSV_PATH = BASE_DIR / "products.csv"

def load_env(file_path: Path) -> dict[str, str]:
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

def main():
    parser = argparse.ArgumentParser(description="Post product to Telegram channel")
    parser.add_argument("--title", help="Title / Hook of the product")
    parser.add_argument("--name", help="Name of the product")
    parser.add_argument("--price", type=float, help="Price of the product")
    parser.add_argument("--discount", help="Discount details")
    parser.add_argument("--benefit", help="Short benefit sentence")
    parser.add_argument("--link", help="Affiliate link")
    parser.add_argument("--hashtags", help="Hashtags for the post")
    parser.add_argument("--image", help="Image URL or local file path")
    args = parser.parse_args()

    # Load environment variables
    env_values = load_env(ENV_PATH)
    parent_env = load_env(BASE_DIR.parent / ".env")
    parent_env_local = load_env(BASE_DIR.parent / ".env.local")

    # Combine environment sources (OS env variables take precedence)
    all_env = {**parent_env, **parent_env_local, **env_values, **os.environ}

    BOT_TOKEN = str(all_env.get("TELEGRAM_BOT_TOKEN", "")).strip().strip('"').strip("'")
    CHANNEL_USERNAME = "@MofxvE487gowN2Y1"

    if not BOT_TOKEN or BOT_TOKEN == "" or BOT_TOKEN == "None":
        print(json.dumps({"ok": False, "error": "TELEGRAM_BOT_TOKEN is not set in environment or env files"}))
        sys.exit(1)

    is_manual = False

    # Check if CLI arguments were passed
    if (args.title and args.name and args.price is not None and 
            args.discount and args.benefit and args.link and args.hashtags and args.image):
        product_title = args.title
        product_name = args.name
        price = args.price
        discount = args.discount
        benefit = args.benefit
        affiliate_link = args.link
        hashtags = args.hashtags
        image_path_or_url = args.image
    else:
        # Fallback to products.csv
        is_manual = True
        if not CSV_PATH.exists():
            print(json.dumps({"ok": False, "error": f"Missing CSV file: {CSV_PATH}"}))
            sys.exit(1)

        try:
            rows = []
            header = []
            with open(CSV_PATH, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                header = reader.fieldnames or []
                rows = list(reader)
        except Exception as e:
            print(json.dumps({"ok": False, "error": f"Failed to read CSV: {str(e)}"}))
            sys.exit(1)

        if "status" not in header:
            print(json.dumps({"ok": False, "error": "products.csv must contain a status column"}))
            sys.exit(1)

        pending_index = -1
        product = None
        for idx, r in enumerate(rows):
            if str(r.get("status", "")).lower() == "pending":
                pending_index = idx
                product = r
                break

        if product is None:
            print(json.dumps({"ok": True, "message": "No pending products found in CSV."}))
            sys.exit(0)
        
        # Safely handle missing custom columns in CSV fallback
        product_title = str(product.get("product_title", "🔥 SPECIAL OFFER!"))
        product_name = str(product.get("product_name", ""))
        price = float(product.get("price", 0.0))
        discount = str(product.get("discount", "Limited Time Deal"))
        benefit = str(product.get("benefit", "Premium quality item, grab yours before stock runs out!"))
        affiliate_link = str(product.get("affiliate_link", ""))
        hashtags = str(product.get("hashtags", "#AffiliateMarketing #Deals"))
        image_path_or_url = str(product.get("image_path", ""))

    # Format price to remove trailing .0 if it's a whole number
    if isinstance(price, (int, float)):
        if float(price).is_integer():
            price_str = f"{int(price)}"
        else:
            price_str = f"{price:.2f}"
    else:
        price_str = str(price)

    # Format discount text to match template without duplicating '%' or 'OFF'
    discount_str = str(discount).strip()
    discount_upper = discount_str.upper()
    if discount_str.isdigit() or (discount_str.replace(".", "", 1).isdigit() and discount_str.count(".") <= 1):
        discount_text = f"{discount_str}% OFF"
    else:
        if "%" in discount_str and "OFF" not in discount_upper:
            discount_text = f"{discount_str} OFF"
        else:
            discount_text = discount_str

    # Compile the final structured message template
    caption = f"""✨ {product_title} ✨

💛 {product_name}

💰 Only ₹{price_str}
🔥 {discount_text}

{benefit}

🛍 Shop Now:
{affiliate_link}

{hashtags}""".strip()

    telegram_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"

    # Check if image_path_or_url is a web URL or local path
    is_url = image_path_or_url.startswith("http://") or image_path_or_url.startswith("https://")

    try:
        if is_url:
            response = requests.post(
                telegram_url,
                data={
                    "chat_id": CHANNEL_USERNAME,
                    "photo": image_path_or_url,
                    "caption": caption,
                },
                timeout=30,
            )
        else:
            # Local image path
            # Resolve relative paths
            local_path = Path(image_path_or_url)
            if not local_path.is_absolute():
                # Check telegram directory first
                test_path = BASE_DIR / local_path
                if test_path.exists():
                    local_path = test_path
                else:
                    # Check root directory next
                    test_path2 = BASE_DIR.parent / local_path
                    if test_path2.exists():
                        local_path = test_path2

            if not local_path.exists():
                print(json.dumps({"ok": False, "error": f"Missing image file at: {image_path_or_url}"}))
                sys.exit(1)

            with local_path.open("rb") as image_file:
                response = requests.post(
                    telegram_url,
                    data={
                        "chat_id": CHANNEL_USERNAME,
                        "caption": caption,
                    },
                    files={
                        "photo": image_file,
                    },
                    timeout=30,
                )

        try:
            result = response.json()
        except ValueError:
            result = {"ok": False, "raw": response.text}

        if not response.ok or not result.get("ok"):
            print(json.dumps({"ok": False, "error": f"Telegram API error: {result}"}))
            sys.exit(1)

        # Update CSV status if we were reading from the CSV
        if is_manual:
            rows[pending_index]["status"] = "posted"
            try:
                with open(CSV_PATH, mode='w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=header)
                    writer.writeheader()
                    writer.writerows(rows)
            except Exception as e:
                print(json.dumps({"ok": False, "error": f"Failed to write CSV: {str(e)}"}))
                sys.exit(1)

        print(json.dumps({"ok": True, "caption": caption, "result": result}))

    except Exception as e:
        print(json.dumps({"ok": False, "error": f"Exception encountered: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
