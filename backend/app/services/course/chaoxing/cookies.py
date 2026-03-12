# Cookies management - simplified for unified platform
import json
from pathlib import Path

COOKIES_FILE = Path("cookies.json")

def save_cookies(session):
    """Save session cookies to file"""
    cookies = session.cookies.get_dict()
    COOKIES_FILE.write_text(json.dumps(cookies))

def use_cookies():
    """Load cookies from file"""
    if COOKIES_FILE.exists():
        return json.loads(COOKIES_FILE.read_text())
    return {}
