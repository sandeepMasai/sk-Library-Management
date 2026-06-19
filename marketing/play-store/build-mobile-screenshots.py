#!/usr/bin/env python3
"""Build proper 1080x1920 mobile-only Play Store screenshots for SmartLibDesk."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
OUT = Path(__file__).resolve().parent / "screenshots"

# Brand colors
TEAL = "#1E5C52"
TEAL_DARK = "#0b3d36"
TEAL_LIGHT = "#2d8a7a"
MINT = "#4fd1c5"
WHITE = "#FFFFFF"
BG = "#F6FFFE"
SLATE = "#64748b"
SLATE_DARK = "#1e293b"
BORDER = "#e2e8f0"
GREEN = "#059669"
AMBER = "#d97706"
ROSE = "#e11d48"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def new_screen() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)


def status_bar(d: ImageDraw.ImageDraw) -> int:
    d.rectangle([0, 0, W, 72], fill=TEAL_DARK)
    d.text((48, 22), "9:41", fill=WHITE, font=font(28))
    d.text((W - 180, 22), "● ● ●", fill=WHITE, font=font(22))
    return 72


def header(d: ImageDraw.ImageDraw, title: str, y: int = 72) -> int:
    d.rectangle([0, y, W, y + 120], fill=TEAL)
    d.text((48, y + 36), title, fill=WHITE, font=font(44, bold=True))
    return y + 120


def bottom_tabs(d: ImageDraw.ImageDraw, active: int, labels: list[str]) -> None:
    h = 140
    y0 = H - h
    d.rectangle([0, y0, W, H], fill=WHITE)
    d.line([0, y0, W, y0], fill=BORDER, width=2)
    n = len(labels)
    slot = W // n
    for i, label in enumerate(labels):
        cx = slot * i + slot // 2
        color = TEAL if i == active else SLATE
        d.ellipse([cx - 28, y0 + 22, cx + 28, y0 + 78], fill=color if i == active else "#e2e8f0")
        d.text((cx - len(label) * 7, y0 + 92), label, fill=color, font=font(20))


def card(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str = WHITE) -> None:
    d.rounded_rectangle([x, y, x + w, y + h], radius=24, fill=fill, outline=BORDER, width=2)


def shot_login() -> Image.Image:
    img, d = new_screen()
    y = status_bar(d)
    # Logo area
    d.rounded_rectangle([W // 2 - 80, y + 60, W // 2 + 80, y + 220], radius=32, fill=TEAL)
    d.text((W // 2 - 110, y + 260), "SmartLibDesk", fill=SLATE_DARK, font=font(52, bold=True))
    d.text((W // 2 - 200, y + 330), "Smart Library. Simplified.", fill=SLATE, font=font(28))

    # Toggle
    ty = y + 420
    d.rounded_rectangle([80, ty, W - 80, ty + 80], radius=20, fill="#e2e8f0")
    d.rounded_rectangle([84, ty + 4, (W // 2) - 4, ty + 76], radius=16, fill=WHITE)
    d.rounded_rectangle([(W // 2) + 4, ty + 4, W - 84, ty + 76], radius=16, fill=TEAL)
    d.text((W // 4 - 50, ty + 24), "Library", fill=SLATE, font=font(28))
    d.text((3 * W // 4 - 60, ty + 24), "Student", fill=WHITE, font=font(28, bold=True))

    # Fields
    fy = ty + 140
    card(d, 80, fy, W - 160, 110)
    d.text((110, fy + 20), "MOBILE", fill=SLATE, font=font(22))
    d.text((110, fy + 55), "9876543210", fill=SLATE_DARK, font=font(36))

    card(d, 80, fy + 140, W - 160, 110)
    d.text((110, fy + 160), "PIN", fill=SLATE, font=font(22))
    d.text((110, fy + 195), "• • • •", fill=SLATE_DARK, font=font(36))

    d.rounded_rectangle([80, fy + 300, W - 80, fy + 400], radius=20, fill=TEAL)
    d.text((W // 2 - 70, fy + 330), "Sign in", fill=WHITE, font=font(36, bold=True))

    d.text((W // 2 - 80, fy + 440), "Forgot PIN?", fill=TEAL, font=font(26))
    return img


def shot_dashboard() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Dashboard", status_bar(d))
    stats = [("48", "Students"), ("42", "Active"), ("85%", "Today"), ("12", "Fee Due")]
    sx, sy = 48, y + 32
    cw, ch = (W - 120) // 2, 150
    for i, (val, lab) in enumerate(stats):
        cx = sx + (i % 2) * (cw + 24)
        cy = sy + (i // 2) * (ch + 24)
        card(d, cx, cy, cw, ch)
        d.text((cx + 24, cy + 24), lab, fill=SLATE, font=font(24))
        d.text((cx + 24, cy + 70), val, fill=SLATE_DARK, font=font(52, bold=True))

    py = sy + 2 * (ch + 24) + 24
    card(d, 48, py, W - 96, 200)
    d.text((72, py + 24), "Payments", fill=SLATE_DARK, font=font(32, bold=True))
    d.text((72, py + 80), "Collected  ₹45,000", fill=GREEN, font=font(28))
    d.text((72, py + 125), "Due  ₹8,500", fill=AMBER, font=font(28))

    qa_y = py + 230
    for i, label in enumerate(["Students", "QR", "Fees", "Notify"]):
        card(d, 48 + i * 252, qa_y, 228, 100, fill="#ecfdf5")
        d.text((72 + i * 252, qa_y + 36), label, fill=TEAL, font=font(26, bold=True))

    bottom_tabs(d, 0, ["Home", "Students", "QR", "Fees", "Seats", "More"])
    return img


def shot_students() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Students", status_bar(d))
    card(d, 48, y + 24, W - 96, 72)
    d.text((72, y + 46), "🔍  Search students...", fill=SLATE, font=font(28))

    names = [("Rahul Sharma", "9876543210", "Active"), ("Priya Verma", "9123456789", "Active"),
             ("Aman Mehta", "9988776655", "Expired"), ("Sneha Patel", "9111222333", "Active")]
    sy = y + 120
    for i, (name, mob, st) in enumerate(names):
        card(d, 48, sy + i * 155, W - 96, 135)
        d.ellipse([72, sy + i * 155 + 28, 132, sy + i * 155 + 88], fill=TEAL_LIGHT)
        d.text((72, sy + i * 155 + 48), name[0], fill=WHITE, font=font(28, bold=True))
        d.text((156, sy + i * 155 + 30), name, fill=SLATE_DARK, font=font(30, bold=True))
        d.text((156, sy + i * 155 + 72), mob, fill=SLATE, font=font(24))
        badge_color = GREEN if st == "Active" else ROSE
        d.rounded_rectangle([W - 200, sy + i * 155 + 48, W - 72, sy + i * 155 + 88], radius=12, fill=badge_color)
        d.text((W - 175, sy + i * 155 + 56), st, fill=WHITE, font=font(20))

    d.ellipse([W - 150, H - 280, W - 48, H - 178], fill=TEAL)
    d.text((W - 115, H - 250), "+", fill=WHITE, font=font(56, bold=True))
    bottom_tabs(d, 1, ["Home", "Students", "QR", "Fees", "Seats", "More"])
    return img


def shot_attendance() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Attendance", status_bar(d))
    # Stats
    card(d, 48, y + 24, W - 96, 90)
    d.text((72, y + 50), "Present 32   |   Members 48   |   67%", fill=SLATE_DARK, font=font(28, bold=True))

    # QR
    qr_size = 480
    qx, qy = (W - qr_size) // 2, y + 140
    card(d, qx - 24, qy - 24, qr_size + 48, qr_size + 48)
    d.rectangle([qx, qy, qx + qr_size, qy + qr_size], fill=WHITE, outline=SLATE_DARK, width=4)
    # fake QR pattern
    cell = qr_size // 12
    for r in range(12):
        for c in range(12):
            if (r + c) % 3 == 0 or r < 3 and c < 3 or r < 3 and c > 8 or r > 8 and c < 3:
                d.rectangle([qx + c * cell, qy + r * cell, qx + (c + 1) * cell, qy + (r + 1) * cell], fill=SLATE_DARK)

    d.text((W // 2 - 200, qy + qr_size + 40), "Show QR for students to scan", fill=SLATE, font=font(26))

    # Check-ins
    ly = qy + qr_size + 100
    d.text((48, ly), "Check-ins", fill=SLATE_DARK, font=font(32, bold=True))
    for i, (name, time) in enumerate([("Rahul Sharma", "8:12 AM"), ("Priya Verma", "8:45 AM"), ("Aman Mehta", "9:01 AM")]):
        card(d, 48, ly + 50 + i * 90, W - 96, 75)
        d.text((72, ly + 72 + i * 90), name, fill=SLATE_DARK, font=font(26))
        d.text((W - 200, ly + 72 + i * 90), time, fill=SLATE, font=font(24))

    bottom_tabs(d, 2, ["Home", "Students", "QR", "Fees", "Seats", "More"])
    return img


def shot_scan() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Scan Attendance", status_bar(d))
    d.rectangle([0, y, W, H - 140], fill="#111827")
    # viewfinder
    fx, fy, fs = 140, y + 200, W - 280
    d.rectangle([fx, fy, fx + fs, fy + fs], outline=MINT, width=6)
    for corner in [(fx, fy), (fx + fs - 60, fy), (fx, fy + fs - 60), (fx + fs - 60, fy + fs - 60)]:
        d.rectangle([corner[0], corner[1], corner[0] + 60, corner[1] + 8], fill=MINT)
        d.rectangle([corner[0], corner[1], corner[0] + 8, corner[1] + 60], fill=MINT)
    d.text((W // 2 - 280, fy + fs + 60), "Point camera at library QR code", fill=WHITE, font=font(30))
    d.rounded_rectangle([W // 2 - 200, H - 380, W // 2 + 200, H - 280], radius=16, fill=TEAL)
    d.text((W // 2 - 90, H - 350), "Scanning...", fill=WHITE, font=font(28))
    bottom_tabs(d, 2, ["Home", "Scan", "Calendar", "Alerts", "Settings"])
    return img


def shot_seats() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Seats", status_bar(d))
    card(d, 48, y + 20, W - 96, 80)
    d.text((72, y + 44), "50 Total  ·  38 Filled  ·  12 Vacant", fill=SLATE_DARK, font=font(28, bold=True))

    for i, label in enumerate(["Morning", "Evening", "Full Day"]):
        fill = TEAL if i == 0 else WHITE
        fg = WHITE if i == 0 else SLATE
        d.rounded_rectangle([48 + i * 200, y + 120, 48 + i * 200 + 180, y + 180], radius=16, fill=fill, outline=BORDER)
        d.text((72 + i * 200, y + 140), label, fill=fg, font=font(24))

    grid_x, grid_y, cell = 48, y + 210, 88
    for n in range(1, 41):
        row, col = (n - 1) // 5, (n - 1) % 5
        cx, cy = grid_x + col * (cell + 12), grid_y + row * (cell + 12)
        occupied = n in {1, 2, 5, 7, 8, 12, 15, 18, 22, 25, 30, 33}
        fill = "#ecfdf5" if occupied else WHITE
        outline = TEAL if occupied else BORDER
        d.rounded_rectangle([cx, cy, cx + cell, cy + cell], radius=12, fill=fill, outline=outline, width=2)
        d.text((cx + 28, cy + 28), str(n), fill=TEAL if occupied else SLATE_DARK, font=font(28, bold=True))

    bottom_tabs(d, 4, ["Home", "Students", "QR", "Fees", "Seats", "More"])
    return img


def shot_payments() -> Image.Image:
    img, d = new_screen()
    y = header(d, "Payments", status_bar(d))
    card(d, 48, y + 24, W - 96, 160, fill=TEAL)
    d.text((72, y + 48), "Total Collected", fill=MINT, font=font(24))
    d.text((72, y + 90), "₹45,000", fill=WHITE, font=font(52, bold=True))
    d.text((W - 320, y + 90), "Due ₹8,500", fill="#fde68a", font=font(32, bold=True))

    for i, tab in enumerate(["All", "Paid", "Pending"]):
        fill = TEAL if i == 0 else WHITE
        fg = WHITE if i == 0 else SLATE
        d.rounded_rectangle([48 + i * 180, y + 210, 48 + i * 180 + 160, y + 270], radius=14, fill=fill, outline=BORDER)
        d.text((88 + i * 180, y + 230), tab, fill=fg, font=font(24))

    rows = [("Rahul Sharma", "₹1,500", "Paid"), ("Priya Verma", "₹1,500", "Pending"), ("Aman Mehta", "₹750", "Half Paid")]
    for i, (name, amt, st) in enumerate(rows):
        card(d, 48, y + 300 + i * 130, W - 96, 110)
        d.text((72, y + 328 + i * 130), name, fill=SLATE_DARK, font=font(28, bold=True))
        d.text((72, y + 368 + i * 130), amt, fill=SLATE, font=font(24))
        col = GREEN if st == "Paid" else AMBER if st == "Half Paid" else ROSE
        d.text((W - 220, y + 340 + i * 130), st, fill=col, font=font(24, bold=True))

    bottom_tabs(d, 3, ["Home", "Students", "QR", "Fees", "Seats", "More"])
    return img


def shot_student_home() -> Image.Image:
    img, d = new_screen()
    y = status_bar(d)
    d.rectangle([0, y, W, y + 200], fill=TEAL)
    d.text((48, y + 40), "Good Morning,", fill=MINT, font=font(28))
    d.text((48, y + 85), "Rahul Sharma", fill=WHITE, font=font(44, bold=True))

    card(d, 48, y + 230, W - 96, 120)
    d.text((72, y + 260), "SK Study Library", fill=SLATE_DARK, font=font(30, bold=True))
    d.text((72, y + 305), "Plan expires: 30 Jun 2026", fill=SLATE, font=font(24))

    card(d, 48, y + 380, W - 96, 200, fill="#eef2ff")
    d.text((W // 2 - 160, y + 420), "📷  Scan Attendance", fill="#4f46e5", font=font(36, bold=True))
    d.text((W // 2 - 200, y + 480), "Tap to check in today", fill=SLATE, font=font(24))

    card(d, 48, y + 610, W - 96, 140)
    d.text((72, y + 640), "This month", fill=SLATE, font=font(24))
    d.text((72, y + 680), "22 days present", fill=GREEN, font=font(36, bold=True))

    card(d, 48, y + 780, W - 96, 200)
    d.text((72, y + 810), "Notifications", fill=SLATE_DARK, font=font(30, bold=True))
    d.text((72, y + 860), "• Library closed tomorrow for maintenance", fill=SLATE, font=font(24))
    d.text((72, y + 900), "• Fee renewal due in 5 days", fill=SLATE, font=font(24))

    bottom_tabs(d, 0, ["Home", "Scan", "Calendar", "Alerts", "Settings"])
    return img


SCREENS = [
    ("01-login-library-student.png", shot_login, "Login"),
    ("02-owner-dashboard.png", shot_dashboard, "Dashboard"),
    ("03-student-management.png", shot_students, "Students"),
    ("04-qr-attendance.png", shot_attendance, "QR Attendance"),
    ("05-scan-attendance.png", shot_scan, "Scan QR"),
    ("06-seat-allocation.png", shot_seats, "Seats"),
    ("07-payments-fees.png", shot_payments, "Payments"),
    ("08-student-home.png", shot_student_home, "Student Home"),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, builder, label in SCREENS:
        img = builder()
        assert img.size == (W, H), f"{name} wrong size {img.size}"
        dest = OUT / name
        img.save(dest, "PNG", optimize=True)
        print(f"OK {name} ({label}) — {dest.stat().st_size // 1024} KB — {img.size[0]}x{img.size[1]}")
    print(f"\nAll mobile screenshots saved to {OUT}")


if __name__ == "__main__":
    main()
