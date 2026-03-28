#!/usr/bin/env python3
"""
Wedding Invitation Video Generator
Creates a 12-second Instagram Reel (9:16) for Dr. Ayush Chawla & Dr. Reea's wedding
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from moviepy import (
    ImageClip, CompositeVideoClip, concatenate_videoclips,
    ColorClip, VideoClip
)

# ─── Configuration ───────────────────────────────────────────────
WIDTH, HEIGHT = 1080, 1920
FPS = 30
DURATION = 12  # seconds

# Color palette
PRIMARY = (239, 227, 207)      # #efe3cf cream
SECONDARY = (200, 169, 106)    # #c8a96a gold
ACCENT = (123, 30, 43)         # #7b1e2b deep maroon
HIGHLIGHT = (247, 242, 233)    # #f7f2e9
WHITE = (255, 255, 255)
BLACK = (30, 20, 15)
GOLD_DARK = (160, 130, 70)

# Paths
ASSETS = "/app/backend/video_assets"
FONTS = f"{ASSETS}/fonts"
OUTPUT = "/app/backend/video_output/wedding_reel.mp4"

# Font helpers
def get_font(name, size):
    font_map = {
        "heading": f"{FONTS}/Cinzel.ttf",
        "script": f"{FONTS}/GreatVibes-Regular.ttf",
        "body": f"{FONTS}/Cormorant.ttf",
        "body_bold": f"{FONTS}/Cormorant.ttf",
        "display": f"{FONTS}/PlayfairDisplay.ttf",
        "brush": f"{FONTS}/AlexBrush-Regular.ttf",
    }
    return ImageFont.truetype(font_map.get(name, font_map["body"]), size)


def draw_text_centered(draw, text, y, font, fill=ACCENT, img_width=WIDTH):
    """Draw horizontally centered text"""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (img_width - tw) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return bbox[3] - bbox[1]


def draw_text_with_shadow(draw, text, y, font, fill=ACCENT, shadow_color=(0,0,0,40), offset=3, img_width=WIDTH):
    """Draw text with subtle shadow for depth"""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (img_width - tw) // 2
    # Shadow
    shadow_img = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_draw.text((x+offset, y+offset), text, font=font, fill=shadow_color)
    # Main text
    draw.text((x, y), text, font=font, fill=fill)
    return bbox[3] - bbox[1]


def create_gradient_overlay(w, h, color_top, color_bottom, alpha_top=0, alpha_bottom=180):
    """Create a vertical gradient overlay"""
    overlay = Image.new("RGBA", (w, h), (0,0,0,0))
    for y in range(h):
        ratio = y / h
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        a = int(alpha_top + (alpha_bottom - alpha_top) * ratio)
        for x in range(w):
            overlay.putpixel((x, y), (r, g, b, a))
    return overlay


def add_film_grain(img, intensity=15):
    """Add subtle film grain"""
    arr = np.array(img)
    noise = np.random.normal(0, intensity, arr.shape[:2])
    for c in range(min(3, arr.shape[2])):
        channel = arr[:,:,c].astype(np.float32)
        channel += noise
        arr[:,:,c] = np.clip(channel, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def draw_decorative_line(draw, y, width=600, color=SECONDARY):
    """Draw ornamental line"""
    x_start = (WIDTH - width) // 2
    x_end = x_start + width
    draw.line([(x_start, y), (x_end, y)], fill=color, width=2)
    # Small diamond in center
    cx = WIDTH // 2
    diamond_size = 6
    draw.polygon([(cx, y-diamond_size), (cx+diamond_size, y), 
                   (cx, y+diamond_size), (cx-diamond_size, y)], fill=color)


def draw_calendar(draw, x, y, month="APRIL 2026", highlight_days=[6, 7], cell_size=60):
    """Draw a mini calendar with highlighted dates"""
    # April 2026 starts on Wednesday (day 3, 0=Mon)
    # Days: 1-30
    days_in_month = 30
    start_day = 2  # Wednesday = 2 (Mon=0)
    
    # Month header
    month_font = get_font("heading", 32)
    draw_text_centered(draw, month, y, month_font, fill=ACCENT)
    
    # Day headers
    day_headers = ["M", "T", "W", "T", "F", "S", "S"]
    header_font = get_font("body_bold", 24)
    cal_width = 7 * cell_size
    cal_x = (WIDTH - cal_width) // 2
    
    y_offset = y + 50
    for i, dh in enumerate(day_headers):
        dx = cal_x + i * cell_size + cell_size // 2
        bbox = draw.textbbox((0,0), dh, font=header_font)
        tw = bbox[2] - bbox[0]
        draw.text((dx - tw//2, y_offset), dh, font=header_font, fill=SECONDARY)
    
    # Day numbers
    day_font = get_font("body", 26)
    highlight_font = get_font("body_bold", 28)
    y_offset += 40
    day = 1
    for week in range(6):
        for dow in range(7):
            if (week == 0 and dow < start_day) or day > days_in_month:
                pass
            else:
                dx = cal_x + dow * cell_size + cell_size // 2
                dy = y_offset + week * cell_size
                
                if day in highlight_days:
                    # Draw heart-shaped highlight
                    draw.ellipse([dx-22, dy-5, dx+22, dy+40], fill=ACCENT)
                    bbox = draw.textbbox((0,0), str(day), font=highlight_font)
                    tw = bbox[2] - bbox[0]
                    draw.text((dx - tw//2, dy+2), str(day), font=highlight_font, fill=WHITE)
                else:
                    bbox = draw.textbbox((0,0), str(day), font=day_font)
                    tw = bbox[2] - bbox[0]
                    draw.text((dx - tw//2, dy+2), str(day), font=day_font, fill=BLACK)
                day += 1
    
    return y_offset + 6 * cell_size


# ─── Scene Renderers ──────────────────────────────────────────────

def render_scene1():
    """Scene 1: Save the Date (0-4s)"""
    bg = Image.open(f"{ASSETS}/scene1_bg.png").convert("RGBA")
    bg = bg.resize((WIDTH, HEIGHT), Image.LANCZOS)
    
    # Slightly darken/warm the background for text readability
    enhancer = ImageEnhance.Brightness(bg)
    bg = enhancer.enhance(0.85)
    
    # Create text overlay
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    
    # Semi-transparent panel behind text
    panel = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle([60, 180, WIDTH-60, HEIGHT-180], radius=30, 
                                  fill=(239, 227, 207, 200))
    bg = Image.alpha_composite(bg.convert("RGBA"), panel)
    
    draw = ImageDraw.Draw(bg)
    
    # Om symbol
    om_font = get_font("body", 60)
    draw_text_centered(draw, "Om", 220, om_font, fill=ACCENT)
    
    # Save the Date
    h1_font = get_font("heading", 56)
    draw_text_centered(draw, "SAVE THE DATE", 310, h1_font, fill=ACCENT)
    
    # Decorative line
    draw_decorative_line(draw, 385)
    
    # Subheading
    sub_font = get_font("body", 34)
    draw_text_centered(draw, "FOR THE WEDDING CELEBRATIONS OF", 410, sub_font, fill=GOLD_DARK)
    
    # Couple names in calligraphy
    name_font = get_font("script", 90)
    draw_text_centered(draw, "Dr. Ayush Chawla", 480, name_font, fill=ACCENT)
    
    # Ampersand
    amp_font = get_font("brush", 70)
    draw_text_centered(draw, "&", 580, amp_font, fill=SECONDARY)
    
    draw_text_centered(draw, "Dr. Reea", 640, name_font, fill=ACCENT)
    
    # Decorative line
    draw_decorative_line(draw, 750)
    
    # Calendar
    draw_calendar(draw, 0, 790, "APRIL 2026", [6, 7])
    
    # Venue
    venue_font = get_font("body_bold", 32)
    draw_text_centered(draw, "The Palm Banquet", HEIGHT - 380, venue_font, fill=ACCENT)
    loc_font = get_font("body", 28)
    draw_text_centered(draw, "Commercial 4, Block-5", HEIGHT - 340, loc_font, fill=GOLD_DARK)
    draw_text_centered(draw, "Block-1 Clifton, Karachi", HEIGHT - 305, loc_font, fill=GOLD_DARK)
    
    # Add grain
    bg = add_film_grain(bg, 8)
    
    return bg.convert("RGB")


def render_scene2():
    """Scene 2: Palace/Venue Reveal (4-6s)"""
    bg = Image.open(f"{ASSETS}/scene2_bg.png").convert("RGBA")
    bg = bg.resize((WIDTH, HEIGHT), Image.LANCZOS)
    
    # Add text overlay at top and bottom
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    
    # Top gradient for text
    for y in range(0, 400):
        alpha = int(200 * (1 - y/400))
        for x in range(WIDTH):
            overlay.putpixel((x, y), (239, 227, 207, alpha))
    
    # Bottom gradient for text
    for y in range(HEIGHT-350, HEIGHT):
        alpha = int(200 * ((y - (HEIGHT-350))/350))
        for x in range(WIDTH):
            overlay.putpixel((x, y), (239, 227, 207, alpha))
    
    bg = Image.alpha_composite(bg, overlay)
    draw = ImageDraw.Draw(bg)
    
    # Top text
    title_font = get_font("heading", 48)
    draw_text_centered(draw, "THE VENUE", 80, title_font, fill=ACCENT)
    
    draw_decorative_line(draw, 145)
    
    venue_font = get_font("script", 72)
    draw_text_centered(draw, "The Palm Banquet", 170, venue_font, fill=ACCENT)
    
    sub_font = get_font("body", 30)
    draw_text_centered(draw, "Clifton, Karachi", 260, sub_font, fill=GOLD_DARK)
    
    # Bottom text - event dates
    event_font = get_font("heading", 36)
    draw_text_centered(draw, "MEHNDI", HEIGHT - 280, event_font, fill=ACCENT)
    date_font = get_font("body", 30)
    draw_text_centered(draw, "Monday, 6th April 2026", HEIGHT - 235, date_font, fill=GOLD_DARK)
    
    draw_decorative_line(draw, HEIGHT - 200, width=400)
    
    draw_text_centered(draw, "WEDDING", HEIGHT - 170, event_font, fill=ACCENT)
    draw_text_centered(draw, "Tuesday, 7th April 2026", HEIGHT - 125, date_font, fill=GOLD_DARK)
    
    bg = add_film_grain(bg, 8)
    return bg.convert("RGB")


def render_scene3():
    """Scene 3: Newspaper/Events Detail (6-9s)"""
    bg = Image.open(f"{ASSETS}/scene3_bg.png").convert("RGBA")
    bg = bg.resize((WIDTH, HEIGHT), Image.LANCZOS)
    
    # Create newspaper overlay
    paper = Image.new("RGBA", (900, 1100), (252, 248, 240, 245))
    paper_draw = ImageDraw.Draw(paper)
    
    # Newspaper border
    paper_draw.rectangle([5, 5, 894, 1094], outline=ACCENT, width=3)
    paper_draw.rectangle([15, 15, 884, 1084], outline=SECONDARY, width=1)
    
    # THE WEDDING TIMES header
    header_font = get_font("heading", 52)
    bbox = paper_draw.textbbox((0, 0), "THE WEDDING TIMES", font=header_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 35), "THE WEDDING TIMES", font=header_font, fill=ACCENT)
    
    # Decorative line under header
    paper_draw.line([(30, 100), (870, 100)], fill=ACCENT, width=3)
    paper_draw.line([(30, 105), (870, 105)], fill=ACCENT, width=1)
    
    # Subtitle
    sub_font = get_font("body", 28)
    bbox = paper_draw.textbbox((0, 0), "Love is making headlines", font=sub_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 115), "Love is making headlines", font=sub_font, fill=GOLD_DARK)
    
    # Main headline
    paper_draw.line([(30, 155), (870, 155)], fill=SECONDARY, width=1)
    
    headline_font = get_font("script", 62)
    hl_text = "Dr. Ayush Chawla"
    bbox = paper_draw.textbbox((0, 0), hl_text, font=headline_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 170), hl_text, font=headline_font, fill=ACCENT)
    
    amp_font = get_font("brush", 50)
    bbox = paper_draw.textbbox((0, 0), "weds", font=amp_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 245), "weds", font=amp_font, fill=SECONDARY)
    
    hl_text2 = "Dr. Reea"
    bbox = paper_draw.textbbox((0, 0), hl_text2, font=headline_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 295), hl_text2, font=headline_font, fill=ACCENT)
    
    paper_draw.line([(30, 380), (870, 380)], fill=ACCENT, width=2)
    
    # Two columns: Mehndi (left) and Wedding (right)
    col_title_font = get_font("heading", 32)
    detail_font = get_font("body", 26)
    detail_bold = get_font("body_bold", 26)
    
    # MEHNDI column
    paper_draw.text((50, 400), "MEHNDI CEREMONY", font=col_title_font, fill=ACCENT)
    paper_draw.line([(50, 440), (420, 440)], fill=SECONDARY, width=1)
    
    paper_draw.text((50, 460), "Monday, 6th April 2026", font=detail_bold, fill=BLACK)
    paper_draw.text((50, 500), "Host:", font=detail_bold, fill=GOLD_DARK)
    paper_draw.text((50, 530), "Mr. & Mrs. Ashok Kumar", font=detail_font, fill=BLACK)
    paper_draw.text((50, 558), "Chawla", font=detail_font, fill=BLACK)
    
    paper_draw.text((50, 600), "Programme:", font=detail_bold, fill=GOLD_DARK)
    paper_draw.text((50, 635), "Rasam ........... 9:00 PM", font=detail_font, fill=BLACK)
    paper_draw.text((50, 668), "Dinner ......... 11:00 PM", font=detail_font, fill=BLACK)
    
    # Vertical divider
    paper_draw.line([(450, 400), (450, 750)], fill=SECONDARY, width=1)
    
    # WEDDING column
    paper_draw.text((480, 400), "WEDDING CEREMONY", font=col_title_font, fill=ACCENT)
    paper_draw.line([(480, 440), (860, 440)], fill=SECONDARY, width=1)
    
    paper_draw.text((480, 460), "Tuesday, 7th April 2026", font=detail_bold, fill=BLACK)
    paper_draw.text((480, 500), "In memory of:", font=detail_bold, fill=GOLD_DARK)
    paper_draw.text((480, 530), "(Late) Mr. Goind Ram", font=detail_font, fill=BLACK)
    paper_draw.text((480, 558), "Chawla", font=detail_font, fill=BLACK)
    
    paper_draw.text((480, 600), "Programme:", font=detail_bold, fill=GOLD_DARK)
    paper_draw.text((480, 635), "Mutuk ........... 7:00 PM", font=detail_font, fill=BLACK)
    paper_draw.text((480, 668), "Vedi ................ 9:00 PM", font=detail_font, fill=BLACK)
    paper_draw.text((480, 701), "Dinner ......... 10:00 PM", font=detail_font, fill=BLACK)
    
    paper_draw.line([(30, 760), (870, 760)], fill=ACCENT, width=2)
    
    # Venue info centered
    venue_title = get_font("heading", 30)
    bbox = paper_draw.textbbox((0, 0), "VENUE", font=venue_title)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 775), "VENUE", font=venue_title, fill=ACCENT)
    
    venue_font = get_font("script", 48)
    bbox = paper_draw.textbbox((0, 0), "The Palm Banquet", font=venue_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 815), "The Palm Banquet", font=venue_font, fill=ACCENT)
    
    addr_font = get_font("body", 24)
    addr = "Commercial 4, Block-5, Block-1 Clifton, Karachi"
    bbox = paper_draw.textbbox((0, 0), addr, font=addr_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 875), addr, font=addr_font, fill=GOLD_DARK)
    
    # RSVP
    paper_draw.line([(30, 920), (870, 920)], fill=SECONDARY, width=1)
    rsvp_font = get_font("heading", 26)
    bbox = paper_draw.textbbox((0, 0), "R.S.V.P.", font=rsvp_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 935), "R.S.V.P.", font=rsvp_font, fill=ACCENT)
    
    contact_font = get_font("body", 24)
    contacts = "0333-7369414  |  0333-7360903"
    bbox = paper_draw.textbbox((0, 0), contacts, font=contact_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 970), contacts, font=contact_font, fill=GOLD_DARK)
    
    names_text = "Ashok Chawla  |  Naveen Chawla  |  Eshan Chawla"
    bbox = paper_draw.textbbox((0, 0), names_text, font=contact_font)
    tw = bbox[2] - bbox[0]
    paper_draw.text(((900-tw)//2, 1000), names_text, font=contact_font, fill=GOLD_DARK)
    
    # Add slight rotation and shadow to newspaper
    paper = paper.rotate(-2, expand=True, fillcolor=(0,0,0,0))
    
    # Composite newspaper onto background
    paper_x = (WIDTH - paper.width) // 2
    paper_y = (HEIGHT - paper.height) // 2 - 50
    bg.paste(paper, (paper_x, paper_y), paper)
    
    bg = add_film_grain(bg, 8)
    return bg.convert("RGB")


def render_scene4():
    """Scene 4: Royal Monogram Closing (9-12s)"""
    bg = Image.open(f"{ASSETS}/scene4_bg.png").convert("RGBA")
    bg = bg.resize((WIDTH, HEIGHT), Image.LANCZOS)
    
    draw = ImageDraw.Draw(bg)
    
    # The mirror area is roughly in the center - draw monogram content there
    # Monogram: A & R (Ayush & Reea)
    monogram_font = get_font("script", 120)
    draw_text_centered(draw, "A & R", HEIGHT//2 - 160, monogram_font, fill=ACCENT)
    
    # Small decorative text under monogram
    sub_font = get_font("heading", 28)
    draw_text_centered(draw, "CHAWLA  -  WADHWANI", HEIGHT//2 - 40, sub_font, fill=GOLD_DARK)
    
    draw_decorative_line(draw, HEIGHT//2 + 5, width=350)
    
    # Date
    date_font = get_font("body_bold", 30)
    draw_text_centered(draw, "6th - 7th April 2026", HEIGHT//2 + 30, date_font, fill=ACCENT)
    
    # Bottom area - #WeAreGettingMarried  
    tag_font = get_font("body", 28)
    draw_text_centered(draw, "Karachi, Pakistan", HEIGHT//2 + 75, tag_font, fill=GOLD_DARK)
    
    # Bottom text
    invite_font = get_font("script", 48)
    draw_text_centered(draw, "You are cordially invited", HEIGHT - 350, invite_font, fill=ACCENT)
    
    contact_font = get_font("body", 26)
    draw_text_centered(draw, "Contact: 0333-7369414 | 0333-7360903", HEIGHT - 280, contact_font, fill=GOLD_DARK)
    
    bg = add_film_grain(bg, 8)
    return bg.convert("RGB")


# ─── Animation & Composition ─────────────────────────────────────

def zoom_effect(clip, zoom_ratio=0.04):
    """Apply slow zoom-in effect"""
    def effect(get_frame, t):
        img = get_frame(t)
        h, w = img.shape[:2]
        zoom = 1 + zoom_ratio * t / clip.duration
        new_h, new_w = int(h * zoom), int(w * zoom)
        
        # Resize
        pil_img = Image.fromarray(img)
        pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)
        
        # Crop center
        left = (new_w - w) // 2
        top = (new_h - h) // 2
        pil_img = pil_img.crop((left, top, left + w, top + h))
        
        return np.array(pil_img)
    
    return clip.transform(effect)


def fade_transition(clip1, clip2, fade_duration=0.5):
    """Cross-fade between two clips"""
    # End of clip1 fades out, start of clip2 fades in
    clip1_faded = clip1.with_effects([])
    clip2_faded = clip2.with_effects([])
    
    return clip1_faded, clip2_faded


def main():
    print("Rendering Scene 1: Save the Date...")
    scene1_img = render_scene1()
    scene1_img.save(f"{ASSETS}/scene1_rendered.png")
    
    print("Rendering Scene 2: Venue Reveal...")
    scene2_img = render_scene2()
    scene2_img.save(f"{ASSETS}/scene2_rendered.png")
    
    print("Rendering Scene 3: Newspaper Details...")
    scene3_img = render_scene3()
    scene3_img.save(f"{ASSETS}/scene3_rendered.png")
    
    print("Rendering Scene 4: Royal Monogram...")
    scene4_img = render_scene4()
    scene4_img.save(f"{ASSETS}/scene4_rendered.png")
    
    print("Composing video with animations...")
    
    from moviepy import vfx
    
    # Create clips with durations
    scene1_clip = ImageClip(np.array(scene1_img)).with_duration(4.0)
    scene2_clip = ImageClip(np.array(scene2_img)).with_duration(2.5)
    scene3_clip = ImageClip(np.array(scene3_img)).with_duration(3.0)
    scene4_clip = ImageClip(np.array(scene4_img)).with_duration(3.0)
    
    # Apply zoom effects
    scene1_clip = zoom_effect(scene1_clip, 0.03)
    scene2_clip = zoom_effect(scene2_clip, 0.05)
    scene3_clip = zoom_effect(scene3_clip, 0.02)
    scene4_clip = zoom_effect(scene4_clip, 0.04)
    
    # Apply crossfade transitions
    fade_dur = 0.5
    
    # Add fade out to each scene and fade in to subsequent scenes
    scene1_clip = scene1_clip.with_effects([vfx.FadeOut(fade_dur)])
    scene2_clip = scene2_clip.with_effects([vfx.CrossFadeIn(fade_dur), vfx.FadeOut(fade_dur)])
    scene3_clip = scene3_clip.with_effects([vfx.CrossFadeIn(fade_dur), vfx.FadeOut(fade_dur)])
    scene4_clip = scene4_clip.with_effects([vfx.CrossFadeIn(fade_dur), vfx.FadeOut(fade_dur)])
    
    # Set start times with overlap for crossfade
    scene1_clip = scene1_clip.with_start(0)
    scene2_clip = scene2_clip.with_start(4.0 - fade_dur)
    scene3_clip = scene3_clip.with_start(4.0 + 2.5 - 2*fade_dur)
    scene4_clip = scene4_clip.with_start(4.0 + 2.5 + 3.0 - 3*fade_dur)
    
    # Composite all scenes
    total_dur = 4.0 + 2.5 + 3.0 + 3.0 - 3*fade_dur  # ~11s
    
    final = CompositeVideoClip(
        [scene1_clip, scene2_clip, scene3_clip, scene4_clip],
        size=(WIDTH, HEIGHT)
    ).with_duration(min(total_dur, 12.0))
    
    # Export
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    
    print(f"Exporting video to {OUTPUT}...")
    final.write_videofile(
        OUTPUT,
        fps=FPS,
        codec="libx264",
        bitrate="8000k",
        preset="medium",
        audio=False,
        logger="bar"
    )
    
    print(f"\nVideo generated successfully!")
    print(f"Output: {OUTPUT}")
    print(f"Duration: {final.duration:.1f}s")
    print(f"Resolution: {WIDTH}x{HEIGHT}")
    print(f"FPS: {FPS}")


if __name__ == "__main__":
    main()
