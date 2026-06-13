import argparse
import json
import os
from pathlib import Path
import sys
import requests

from config import ACCESS_TOKEN, IG_USER_ID


def create_media_container(image_url: str, caption: str) -> str:
    endpoint = f"https://graph.facebook.com/v25.0/{IG_USER_ID}/media"

    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": ACCESS_TOKEN,
    }

    response = requests.post(endpoint, data=payload, timeout=30)

    try:
        result = response.json()
    except ValueError:
        result = {"ok": False, "raw": response.text}

    if not response.ok or "id" not in result:
        raise RuntimeError(f"Instagram API error: {result}")

    return result["id"]


def publish_media(creation_id: str) -> dict:
    endpoint = f"https://graph.facebook.com/v25.0/{IG_USER_ID}/media_publish"

    payload = {
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN,
    }

    response = requests.post(endpoint, data=payload, timeout=30)

    try:
        result = response.json()
    except ValueError:
        result = {"ok": False, "raw": response.text}

    if not response.ok:
        raise RuntimeError(f"Instagram API error: {result}")

    return result


def main():
    parser = argparse.ArgumentParser(description="Post product to Instagram")
    parser.add_argument("--title", help="Title / Hook of the product")
    parser.add_argument("--name", help="Name of the product")
    parser.add_argument("--price", type=float, help="Price of the product")
    parser.add_argument("--discount", help="Discount details")
    parser.add_argument("--benefit", help="Short benefit sentence")
    parser.add_argument("--link", help="Affiliate link")
    parser.add_argument("--hashtags", help="Hashtags for the post")
    parser.add_argument("--image", help="Image URL")
    args = parser.parse_args()

    if not IG_USER_ID or not ACCESS_TOKEN:
        print(json.dumps({"ok": False, "error": "Instagram credentials (IG_USER_ID or ACCESS_TOKEN) not set in environment"}))
        sys.exit(1)

    product_title = args.title or "🔥 SPECIAL OFFER!"
    product_name = args.name or "Special Product"
    price = args.price or 0.0
    discount = args.discount or "Limited Time Deal"
    benefit = args.benefit or "Grab yours before stock runs out!"
    affiliate_link = args.link or ""
    hashtags = args.hashtags or "#AffiliateDeals"
    image_url = args.image

    if not image_url:
        print(json.dumps({"ok": False, "error": "Missing image URL"}))
        sys.exit(1)

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

    try:
        creation_id = create_media_container(image_url=image_url, caption=caption)
        result = publish_media(creation_id)
        print(json.dumps({"ok": True, "caption": caption, "result": result}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
