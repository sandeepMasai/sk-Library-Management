#!/usr/bin/env python3
"""Resize screenshots to Play Store phone spec: 1080 x 1920 PNG."""
from pathlib import Path
from PIL import Image

SRC = Path("/Users/sandeep/.cursor/projects/Users-sandeep-Desktop-sandeep-lib/assets")
OUT = Path(__file__).resolve().parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

TARGET_W, TARGET_H = 1080, 1920

SCREENS = [
    ("screenshot-01-login.png", "01-login-library-student.png", "Login — Library & Student"),
    ("screenshot-02-dashboard.png", "02-owner-dashboard.png", "Owner Dashboard"),
    ("screenshot-03-students.png", "03-student-management.png", "Student Management"),
    ("screenshot-04-attendance-qr.png", "04-qr-attendance.png", "QR Attendance"),
    ("screenshot-05-scan-qr.png", "05-scan-attendance.png", "Scan Attendance"),
    ("screenshot-06-seats.png", "06-seat-allocation.png", "Seat Allocation"),
    ("screenshot-07-payments.png", "07-payments-fees.png", "Payments & Fees"),
    ("screenshot-08-student-home.png", "08-student-home.png", "Student Home"),
]


def fit_cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    sw, sh = img.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


for src_name, out_name, label in SCREENS:
    src = SRC / src_name
    if not src.exists():
        print(f"SKIP missing: {src}")
        continue
    img = Image.open(src).convert("RGB")
    out = fit_cover(img, TARGET_W, TARGET_H)
    dest = OUT / out_name
    out.save(dest, "PNG", optimize=True)
    print(f"OK {out_name} ({label}) — {dest.stat().st_size // 1024} KB")

print(f"\nDone: {OUT}")
