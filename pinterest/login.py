from pathlib import Path
import json

from playwright.sync_api import sync_playwright


BASE_DIR = Path(__file__).resolve().parent
COOKIES_PATH = BASE_DIR / "cookies.json"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=False)
    page = browser.new_page()

    page.goto("https://www.pinterest.com/login/")

    print("Login manually...", flush=True)
    input("Press ENTER after login...")

    cookies = page.context.cookies()

    with COOKIES_PATH.open("w", encoding="utf-8") as file_handle:
        json.dump(cookies, file_handle, indent=2)

    print("Cookies saved successfully!", flush=True)

    browser.close()
