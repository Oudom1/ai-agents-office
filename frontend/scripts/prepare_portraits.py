#!/usr/bin/env python3
"""Generate separate framed portraits from user-approved artwork for frontend build."""
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

URL = "https://cdn.openart.ai/openart-uploads/production/attachment-transfers/7e266aaa058d7d314d5382cbdae610e5e0c81063e94ac5fca041903fec9509eb.png"
PORTRAITS = {
    "manager": (68, 2, 335, 232),
    "sysadmin": (12, 546, 225, 748),
    "security": (505, 546, 718, 748),
    "cloud": (998, 546, 1211, 748),
    "qa": (12, 787, 225, 989),
    "implement": (505, 787, 718, 989),
    "developer": (998, 787, 1211, 989),
}
destination = Path(__file__).resolve().parents[1] / "public" / "portraits"
destination.mkdir(parents=True, exist_ok=True)
req = Request(URL, headers={"User-Agent": "AI-Agents-Office-Asset-Build/1.0"})
with urlopen(req, timeout=40) as response:
    raw = response.read()
source = Image.open(BytesIO(raw)).convert("RGB")
if source.size != (1509, 1042):
    raise RuntimeError(f"Artwork dimensions changed: {source.size}")
for role, area in PORTRAITS.items():
    portrait = source.crop(area)
    portrait.save(destination / f"{role}.webp", "WEBP", quality=90, method=6)
    print(f"Created {role}.webp")
