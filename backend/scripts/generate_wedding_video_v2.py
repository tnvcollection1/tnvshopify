#!/usr/bin/env python3
"""
Wedding Invitation Video Generator - Reverse Engineered from Reference
Creates a ~28-second Instagram Reel matching the reference video style.

Scenes:
1. Royal Vanity Table (0-8s) - Items appear, monogram reveals in mirror
2. Newspaper Reading (8-17s) - Wedding details in newspaper format
3. Venue + Save the Date (17-28s) - Venue reveal with progressive text
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from moviepy import ImageClip, CompositeVideoClip, ColorClip, VideoClip, vfx

# ─── Configuration ───────────────────────────────────────────────
WIDTH, HEIGHT = 1080, 1920
FPS = 24
TOTAL_DURATION = 28

# Color palette (matching reference: warm vintage)
CREAM = (239, 227, 207)
GOLD = (200, 169, 106)
DARK_GOLD = (160, 130, 70)
ACCENT = (123, 30, 43)       # deep maroon/red
WHITE = (255, 255, 255)
BLACK = (35, 25, 20)
WARM_BLACK = (60, 45, 35)
PAPER = (252, 248, 238)

# Paths
ASSETS = "/app/backend/video_assets"
FONTS = f"{ASSETS}/fonts"
OUTPUT = "/app/backend/video_output/wedding_reel_v2.mp4"

def get_font(name, size):
    font_map = {
        "heading": f"{FONTS}/Cinzel.ttf",
        "script": f"{FONTS}/GreatVibes-Regular.ttf",
        "body": f"{FONTS}/Cormorant.ttf",
        "display": f"{FONTS}/PlayfairDisplay.ttf",
        "brush": f"{FONTS}/AlexBrush-Regular.ttf",
    }
    return ImageFont.truetype(font_map.get(name, font_map["body"]), size)

def text_center_x(draw, text, font, img_width=WIDTH):
    bbox = draw.textbbox((0, 0), text, font=font)
    return (img_width - (bbox[2] - bbox[0])) // 2

def draw_centered(draw, text, y, font, fill=ACCENT, img_w=WIDTH):
    x = text_center_x(draw, text, font, img_w)
    draw.text((x, y), text, font=font, fill=fill)

def ease_in_out(t):
    """Smooth ease in-out curve (0 to 1)"""
    return t * t * (3 - 2 * t)

def ease_out(t):
    return 1 - (1 - t) ** 3

def lerp(a, b, t):
    """Linear interpolation"""
    return a + (b - a) * t

def composite_overlay(base_rgb, overlay_rgba, alpha=1.0):
    """Composite an RGBA overlay onto an RGB base with extra alpha control.
    Only blends where overlay has actual content (non-transparent)."""
    base = base_rgb.convert("RGBA")
    # Scale overlay alpha channel by the given alpha factor
    if alpha < 1.0:
        overlay_copy = overlay_rgba.copy()
        r, g, b, a = overlay_copy.split()
        a = a.point(lambda x: int(x * alpha))
        overlay_copy = Image.merge("RGBA", (r, g, b, a))
    else:
        overlay_copy = overlay_rgba
    result = Image.alpha_composite(base, overlay_copy)
    return result.convert("RGB")

def add_film_grain(img, intensity=10):
    arr = np.array(img).astype(np.float32)
    noise = np.random.normal(0, intensity, arr.shape[:2])
    for c in range(3):
        arr[:,:,c] += noise
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))

def draw_ornamental_line(draw, y, width=500, color=GOLD, img_w=WIDTH):
    x1 = (img_w - width) // 2
    x2 = x1 + width
    draw.line([(x1, y), (x2, y)], fill=color, width=2)
    cx = img_w // 2
    draw.polygon([(cx, y-5), (cx+5, y), (cx, y+5), (cx-5, y)], fill=color)

def draw_heart(draw, cx, cy, size=12, fill=ACCENT):
    """Draw a simple heart shape"""
    pts = []
    for angle in range(0, 360, 5):
        rad = math.radians(angle)
        x = size * 16 * (math.sin(rad) ** 3) / 16
        y = -size * (13*math.cos(rad) - 5*math.cos(2*rad) - 2*math.cos(3*rad) - math.cos(4*rad)) / 16
        pts.append((int(cx + x), int(cy + y)))
    if len(pts) > 2:
        draw.polygon(pts, fill=fill)

# ─── Load Base Images ─────────────────────────────────────────────
def load_scene_bg(filename):
    img = Image.open(f"{ASSETS}/{filename}").convert("RGB")
    return img.resize((WIDTH, HEIGHT), Image.LANCZOS)

# ─── Scene 1: Vanity Table with Mirror (0-8s) ────────────────────
def create_scene1_frames():
    """
    Scene 1: Vanity table. 
    0-3s: Base vanity visible, slight zoom
    3-5s: Monogram "A & R" fades into mirror area
    5-8s: Names + decorative elements appear
    """
    bg = load_scene_bg("scene4_bg.png")
    
    # Pre-render text overlays at different states
    frames_data = []
    
    # Monogram overlay
    monogram_img = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    md = ImageDraw.Draw(monogram_img)
    
    # Monogram "A & R" in the mirror area (center of image)
    mono_font = get_font("script", 130)
    draw_centered(md, "A & R", HEIGHT//2 - 190, mono_font, fill=ACCENT + (255,), img_w=WIDTH)
    
    # Family names below monogram
    name_font = get_font("heading", 30)
    draw_centered(md, "CHAWLA  &  WADHWANI", HEIGHT//2 - 50, name_font, fill=DARK_GOLD + (255,), img_w=WIDTH)
    
    # Date line
    date_font = get_font("body", 28)
    draw_centered(md, "April 2026  |  Karachi", HEIGHT//2 + 0, date_font, fill=WARM_BLACK + (255,), img_w=WIDTH)
    
    # Names overlay (appears after monogram)
    names_img = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    nd = ImageDraw.Draw(names_img)
    couple_font = get_font("script", 55)
    draw_centered(nd, "Dr. Ayush Chawla", HEIGHT//2 + 50, couple_font, fill=ACCENT + (255,), img_w=WIDTH)
    amp_font = get_font("brush", 45)
    draw_centered(nd, "&", HEIGHT//2 + 115, amp_font, fill=GOLD + (255,), img_w=WIDTH)
    draw_centered(nd, "Dr. Reea", HEIGHT//2 + 150, couple_font, fill=ACCENT + (255,), img_w=WIDTH)
    
    return bg, monogram_img, names_img  # Keep as RGBA!


# ─── Scene 2: Newspaper (8-17s) ──────────────────────────────────
def create_scene2_base():
    """Create the newspaper scene with all wedding details"""
    bg = load_scene_bg("scene3_bg.png")
    
    # Create newspaper overlay
    paper_w, paper_h = 940, 1200
    paper = Image.new("RGBA", (paper_w, paper_h), (252, 248, 238, 248))
    pd = ImageDraw.Draw(paper)
    
    # Double border
    pd.rectangle([4, 4, paper_w-5, paper_h-5], outline=ACCENT, width=3)
    pd.rectangle([12, 12, paper_w-13, paper_h-13], outline=GOLD, width=1)
    
    # "THE WEDDING TIMES" masthead
    masthead = get_font("heading", 50)
    bbox = pd.textbbox((0,0), "THE WEDDING TIMES", font=masthead)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 30), "THE WEDDING TIMES", font=masthead, fill=BLACK)
    
    # Double line under masthead
    pd.line([(25, 95), (paper_w-25, 95)], fill=ACCENT, width=3)
    pd.line([(25, 100), (paper_w-25, 100)], fill=ACCENT, width=1)
    
    # "SAVE THE DATE" in red
    save_font = get_font("heading", 44)
    bbox = pd.textbbox((0,0), "SAVE THE DATE", font=save_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 110), "SAVE THE DATE", font=save_font, fill=ACCENT)
    
    # Hashtag
    hash_font = get_font("body", 22)
    bbox = pd.textbbox((0,0), "#AyushWedsReea", font=hash_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 162), "#AyushWedsReea", font=hash_font, fill=GOLD)
    
    pd.line([(25, 190), (paper_w-25, 190)], fill=GOLD, width=1)
    
    # Couple Names - large centered
    couple_script = get_font("script", 70)
    bbox = pd.textbbox((0,0), "Dr. Ayush Chawla", font=couple_script)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 200), "Dr. Ayush Chawla", font=couple_script, fill=ACCENT)
    
    amp = get_font("brush", 55)
    bbox = pd.textbbox((0,0), "&", font=amp)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 275), "&", font=amp, fill=GOLD)
    
    bbox = pd.textbbox((0,0), "Dr. Reea", font=couple_script)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 320), "Dr. Reea", font=couple_script, fill=ACCENT)
    
    # "ARE GETTING MARRIED"
    marry_font = get_font("heading", 28)
    bbox = pd.textbbox((0,0), "ARE GETTING MARRIED", font=marry_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 400), "ARE GETTING MARRIED", font=marry_font, fill=WARM_BLACK)
    
    pd.line([(25, 440), (paper_w-25, 440)], fill=ACCENT, width=2)
    
    # ── Calendar: APRIL 2026 ──
    cal_font = get_font("heading", 30)
    bbox = pd.textbbox((0,0), "APRIL, 2026", font=cal_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, 455), "APRIL, 2026", font=cal_font, fill=WARM_BLACK)
    
    # Day headers
    days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    day_font = get_font("body", 18)
    num_font = get_font("body", 22)
    cell_w = 110
    cal_left = (paper_w - 7 * cell_w) // 2
    cal_y = 500
    
    for i, d in enumerate(days):
        bbox = pd.textbbox((0,0), d, font=day_font)
        tw = bbox[2] - bbox[0]
        pd.text((cal_left + i*cell_w + (cell_w-tw)//2, cal_y), d, font=day_font, fill=DARK_GOLD)
    
    # April 2026: starts Wednesday (day index 3, 0=Sun)
    start_dow = 3  # Wednesday
    days_in_month = 30
    day_num = 1
    row_y = cal_y + 30
    highlight_days = [6, 7]
    
    for week in range(6):
        for dow in range(7):
            if (week == 0 and dow < start_dow) or day_num > days_in_month:
                pass
            else:
                cx = cal_left + dow * cell_w + cell_w // 2
                cy = row_y + week * 38
                
                if day_num in highlight_days:
                    draw_heart(pd, cx, cy + 8, size=14, fill=ACCENT)
                    bbox = pd.textbbox((0,0), str(day_num), font=num_font)
                    tw = bbox[2] - bbox[0]
                    pd.text((cx - tw//2, cy - 4), str(day_num), font=num_font, fill=WHITE)
                else:
                    bbox = pd.textbbox((0,0), str(day_num), font=num_font)
                    tw = bbox[2] - bbox[0]
                    pd.text((cx - tw//2, cy - 2), str(day_num), font=num_font, fill=WARM_BLACK)
                day_num += 1
    
    cal_bottom = row_y + 5 * 38 + 30
    
    pd.line([(25, cal_bottom), (paper_w-25, cal_bottom)], fill=GOLD, width=1)
    
    # Events section
    ev_y = cal_bottom + 10
    event_title = get_font("heading", 26)
    event_detail = get_font("body", 22)
    
    # MEHNDI
    pd.text((40, ev_y), "MEHNDI CEREMONY", font=event_title, fill=ACCENT)
    pd.text((40, ev_y + 30), "Monday, 6th April 2026", font=event_detail, fill=WARM_BLACK)
    pd.text((40, ev_y + 55), "Rasam 9:00 PM  |  Dinner 11:00 PM", font=event_detail, fill=DARK_GOLD)
    
    # Vertical divider
    mid_x = paper_w // 2
    pd.line([(mid_x, ev_y), (mid_x, ev_y + 80)], fill=GOLD, width=1)
    
    # WEDDING
    pd.text((mid_x + 20, ev_y), "WEDDING CEREMONY", font=event_title, fill=ACCENT)
    pd.text((mid_x + 20, ev_y + 30), "Tuesday, 7th April 2026", font=event_detail, fill=WARM_BLACK)
    pd.text((mid_x + 20, ev_y + 55), "Mutuk 7PM | Vedi 9PM | Dinner 10PM", font=event_detail, fill=DARK_GOLD)
    
    pd.line([(25, ev_y + 90), (paper_w-25, ev_y + 90)], fill=ACCENT, width=2)
    
    # Venue
    venue_y = ev_y + 105
    venue_title = get_font("heading", 28)
    bbox = pd.textbbox((0,0), "VENUE", font=venue_title)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, venue_y), "VENUE", font=venue_title, fill=ACCENT)
    
    venue_name = get_font("script", 50)
    bbox = pd.textbbox((0,0), "The Palm Banquet", font=venue_name)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, venue_y + 35), "The Palm Banquet", font=venue_name, fill=ACCENT)
    
    addr_font = get_font("body", 22)
    addr = "Commercial 4, Block-5, Block-1 Clifton, Karachi"
    bbox = pd.textbbox((0,0), addr, font=addr_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, venue_y + 95), addr, font=addr_font, fill=DARK_GOLD)
    
    # RSVP
    pd.line([(25, venue_y + 125), (paper_w-25, venue_y + 125)], fill=GOLD, width=1)
    rsvp_y = venue_y + 135
    rsvp_font = get_font("heading", 24)
    bbox = pd.textbbox((0,0), "Regards", font=rsvp_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, rsvp_y), "Regards", font=rsvp_font, fill=ACCENT)
    
    family_font = get_font("body", 22)
    fam = "Mr. & Mrs. Ashok Kumar Chawla  |  Nand Lal Wadhwani"
    bbox = pd.textbbox((0,0), fam, font=family_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, rsvp_y + 28), fam, font=family_font, fill=WARM_BLACK)
    
    contact = "0333-7369414  |  0333-7360903"
    bbox = pd.textbbox((0,0), contact, font=family_font)
    tw = bbox[2] - bbox[0]
    pd.text(((paper_w-tw)//2, rsvp_y + 55), contact, font=family_font, fill=DARK_GOLD)
    
    # Slight rotation for newspaper feel
    paper = paper.rotate(-1.5, expand=True, fillcolor=(0,0,0,0))
    
    # Composite newspaper onto background
    px = (WIDTH - paper.width) // 2
    py = (HEIGHT - paper.height) // 2 - 30
    bg_rgba = bg.convert("RGBA")
    bg_rgba.paste(paper, (px, py), paper)
    
    return bg_rgba.convert("RGB")


# ─── Scene 3: Venue + Save the Date (17-28s) ─────────────────────
def create_scene3_layers():
    """
    Progressive reveal:
    17-19s: Venue building visible
    19-20s: "SAVE THE DATE" appears
    20-21s: "FOR THE WEDDING CELEBRATIONS OF"
    21-23s: "Dr. Ayush Chawla & Dr. Reea" in script
    23-25s: Calendar overlay with April 2026
    25-27s: Venue name + location
    27-28s: "Formal invite to follow"
    """
    bg = load_scene_bg("scene2_bg.png")
    
    # Create each text layer as separate image for progressive reveal
    layers = []
    
    # Layer 0: "SAVE THE DATE"
    l0 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d0 = ImageDraw.Draw(l0)
    save_font = get_font("heading", 56)
    draw_centered(d0, "SAVE THE DATE", 120, save_font, fill=ACCENT + (255,))
    layers.append(l0)
    
    # Layer 1: "FOR THE WEDDING CELEBRATIONS OF"
    l1 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d1 = ImageDraw.Draw(l1)
    sub_font = get_font("heading", 28)
    draw_centered(d1, "FOR THE WEDDING CELEBRATIONS OF", 195, sub_font, fill=WARM_BLACK + (255,))
    layers.append(l1)
    
    # Layer 2: Couple names
    l2 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d2 = ImageDraw.Draw(l2)
    name_font = get_font("script", 78)
    draw_centered(d2, "Dr. Ayush Chawla", 240, name_font, fill=ACCENT + (255,))
    amp_font = get_font("brush", 50)
    draw_centered(d2, "&", 335, amp_font, fill=GOLD + (255,))
    draw_centered(d2, "Dr. Reea", 380, name_font, fill=ACCENT + (255,))
    layers.append(l2)
    
    # Layer 3: Calendar 
    l3 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d3 = ImageDraw.Draw(l3)
    
    # Semi-transparent panel behind calendar
    panel_x, panel_y = 140, 475
    panel_w, panel_h = 800, 340
    d3.rounded_rectangle([panel_x, panel_y, panel_x+panel_w, panel_y+panel_h], 
                          radius=15, fill=(252, 248, 238, 220))
    
    cal_font = get_font("heading", 32)
    draw_centered(d3, "APRIL, 2026", 490, cal_font, fill=WARM_BLACK + (255,))
    
    days_h = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    hdr_font = get_font("body", 18)
    num_font = get_font("body", 22)
    cell_w = 100
    cal_left = (WIDTH - 7 * cell_w) // 2
    cal_y = 535
    
    for i, d in enumerate(days_h):
        bbox = d3.textbbox((0,0), d, font=hdr_font)
        tw = bbox[2] - bbox[0]
        d3.text((cal_left + i*cell_w + (cell_w-tw)//2, cal_y), d, font=hdr_font, fill=DARK_GOLD + (255,))
    
    start_dow = 3
    day_num = 1
    row_y = cal_y + 28
    
    for week in range(5):
        for dow in range(7):
            if (week == 0 and dow < start_dow) or day_num > 30:
                pass
            else:
                cx = cal_left + dow * cell_w + cell_w // 2
                cy = row_y + week * 36
                
                if day_num in [6, 7]:
                    draw_heart(d3, cx, cy + 8, size=13, fill=ACCENT + (255,))
                    bbox = d3.textbbox((0,0), str(day_num), font=num_font)
                    tw = bbox[2] - bbox[0]
                    d3.text((cx - tw//2, cy - 2), str(day_num), font=num_font, fill=WHITE + (255,))
                else:
                    bbox = d3.textbbox((0,0), str(day_num), font=num_font)
                    tw = bbox[2] - bbox[0]
                    d3.text((cx - tw//2, cy), str(day_num), font=num_font, fill=WARM_BLACK + (255,))
                day_num += 1
    
    layers.append(l3)
    
    # Layer 4: Venue details
    l4 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d4 = ImageDraw.Draw(l4)
    
    vy = 840
    d4.rounded_rectangle([180, vy-10, WIDTH-180, vy+120], radius=12, fill=(252, 248, 238, 200))
    
    venue_label = get_font("heading", 26)
    draw_centered(d4, "VENUE", vy, venue_label, fill=ACCENT + (255,))
    venue_name = get_font("script", 52)
    draw_centered(d4, "The Palm Banquet", vy + 30, venue_name, fill=ACCENT + (255,))
    addr_font = get_font("body", 22)
    draw_centered(d4, "Block-1 Clifton, Karachi", vy + 90, addr_font, fill=DARK_GOLD + (255,))
    layers.append(l4)
    
    # Layer 5: "Formal invite to follow"
    l5 = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    d5 = ImageDraw.Draw(l5)
    formal_font = get_font("body", 28)
    draw_centered(d5, "Formal invite to follow", HEIGHT - 250, formal_font, fill=WARM_BLACK + (255,))
    
    contact_font = get_font("body", 24)
    draw_centered(d5, "0333-7369414  |  0333-7360903", HEIGHT - 210, contact_font, fill=DARK_GOLD + (255,))
    layers.append(l5)
    
    return bg, layers  # Keep layers as RGBA!


# ─── Video Composition ────────────────────────────────────────────

def make_frame_scene1(t, bg, monogram, names):
    """Scene 1: 0-8s. Vanity with progressive reveals + slow zoom"""
    frame = bg.copy()
    w, h = frame.size
    
    # Zoom effect
    zoom = 1.0 + 0.015 * t
    new_w, new_h = int(w * zoom), int(h * zoom)
    frame = frame.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    frame = frame.crop((left, top, left + w, top + h))
    
    # Monogram appears at t=3s, fully visible by t=5s
    if t > 3.0:
        mono_alpha = min(1.0, ease_out((t - 3.0) / 2.0))
        frame = composite_overlay(frame, monogram, mono_alpha)
    
    # Names appear at t=5s, fully visible by t=7s
    if t > 5.0:
        name_alpha = min(1.0, ease_out((t - 5.0) / 2.0))
        frame = composite_overlay(frame, names, name_alpha)
    
    return np.array(add_film_grain(frame, 6))


def make_frame_scene2(t, newspaper_img):
    """Scene 2: 8-17s. Newspaper with slow zoom into details"""
    frame = newspaper_img.copy()
    w, h = frame.size
    
    # Slow zoom in to newspaper
    zoom = 1.0 + 0.02 * t
    new_w, new_h = int(w * zoom), int(h * zoom)
    frame = frame.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    frame = frame.crop((left, top, left + w, top + h))
    
    return np.array(add_film_grain(frame, 6))


def make_frame_scene3(t, bg, layers):
    """Scene 3: 17-28s. Progressive text reveals over venue"""
    frame = bg.copy()
    w, h = frame.size
    
    # Slow zoom
    zoom = 1.0 + 0.012 * t
    new_w, new_h = int(w * zoom), int(h * zoom)
    frame = frame.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    frame = frame.crop((left, top, left + w, top + h))
    
    # Progressive layer reveals
    reveal_times = [1.0, 2.5, 3.5, 5.0, 7.0, 8.5]
    fade_durations = [1.0, 0.8, 1.2, 1.5, 1.0, 0.8]
    
    for i, (reveal_t, fade_d) in enumerate(zip(reveal_times, fade_durations)):
        if t > reveal_t and i < len(layers):
            alpha = min(1.0, ease_out((t - reveal_t) / fade_d))
            frame = composite_overlay(frame, layers[i], alpha)
    
    return np.array(add_film_grain(frame, 6))


def main():
    print("=" * 60)
    print("Wedding Video Generator v2 - Reverse Engineered")
    print("Dr. Ayush Chawla & Dr. Reea")
    print("=" * 60)
    
    # ── Prepare all scene assets ──
    print("\n[1/4] Preparing Scene 1: Royal Vanity...")
    s1_bg, s1_mono, s1_names = create_scene1_frames()
    
    print("[2/4] Preparing Scene 2: Newspaper...")
    s2_img = create_scene2_base()
    
    print("[3/4] Preparing Scene 3: Venue Reveal...")
    s3_bg, s3_layers = create_scene3_layers()
    
    # Save individual scene renders for preview
    s2_img.save(f"{ASSETS}/scene2_v2_rendered.png")
    
    # ── Build video clips ──
    print("[4/4] Composing video frames...")
    
    scene1_dur = 8.0
    scene2_dur = 9.0
    scene3_dur = 11.0
    fade = 0.8
    
    # Scene 1 clip
    def s1_frame(t):
        return make_frame_scene1(t, s1_bg, s1_mono, s1_names)
    
    scene1_clip = VideoClip(s1_frame, duration=scene1_dur)
    
    # Scene 2 clip
    def s2_frame(t):
        return make_frame_scene2(t, s2_img)
    
    scene2_clip = VideoClip(s2_frame, duration=scene2_dur)
    
    # Scene 3 clip
    def s3_frame(t):
        return make_frame_scene3(t, s3_bg, s3_layers)
    
    scene3_clip = VideoClip(s3_frame, duration=scene3_dur)
    
    # Apply fade transitions
    scene1_clip = scene1_clip.with_effects([vfx.FadeIn(0.5), vfx.FadeOut(fade)])
    scene2_clip = scene2_clip.with_effects([vfx.CrossFadeIn(fade), vfx.FadeOut(fade)])
    scene3_clip = scene3_clip.with_effects([vfx.CrossFadeIn(fade), vfx.FadeOut(1.0)])
    
    # Set overlapping start times for crossfade
    scene1_clip = scene1_clip.with_start(0)
    scene2_clip = scene2_clip.with_start(scene1_dur - fade)
    scene3_clip = scene3_clip.with_start(scene1_dur + scene2_dur - 2*fade)
    
    total = scene1_dur + scene2_dur + scene3_dur - 2*fade
    
    final = CompositeVideoClip(
        [scene1_clip, scene2_clip, scene3_clip],
        size=(WIDTH, HEIGHT)
    ).with_duration(total)
    
    # Export
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    
    print(f"\nExporting to {OUTPUT}...")
    print(f"Duration: {total:.1f}s | Resolution: {WIDTH}x{HEIGHT} | FPS: {FPS}")
    
    final.write_videofile(
        OUTPUT,
        fps=FPS,
        codec="libx264",
        bitrate="10000k",
        preset="medium",
        audio=False,
        logger="bar"
    )
    
    print(f"\nVideo generated successfully!")
    print(f"Output: {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
