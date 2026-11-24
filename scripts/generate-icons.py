#!/usr/bin/env python3
import os
import math
from PIL import Image, ImageDraw

sizes = [16, 32, 48, 128, 256, 512]
output_dirs = [
    "/home/sajol/Server/Tool/hardreload/extension/assets",
    "/home/sajol/Server/Tool/hardreload/public/icons"
]

for d in output_dirs:
    os.makedirs(d, exist_ok=True)

def draw_icon(size):
    # High-resolution super-sampling factor (4x) for crisp anti-aliasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    corner_radius = int(canvas_size * 0.22)
    bg_color = (79, 70, 229, 255) # Indigo 600
    accent_dark = (67, 56, 202, 255) # Indigo 700
    
    # Gradient or solid sleek background
    draw.rounded_rectangle(
        [0, 0, canvas_size - 1, canvas_size - 1],
        radius=corner_radius,
        fill=bg_color
    )

    # Center coordinates
    cx = canvas_size / 2.0
    cy = canvas_size / 2.0

    # Draw circular reload arrow
    r = canvas_size * 0.30
    arc_width = max(int(canvas_size * 0.08), 2 * scale)
    
    # Bounding box for arc
    bbox = [cx - r, cy - r, cx + r, cy + r]
    
    # 290 degree arc starting from 40 to 330 degrees
    draw.arc(bbox, start=35, end=310, fill=(255, 255, 255, 255), width=arc_width)

    # Arrowhead at 310 degrees
    angle_rad = math.radians(310)
    tip_x = cx + r * math.cos(angle_rad)
    tip_y = cy + r * math.sin(angle_rad)
    
    arrow_size = arc_width * 1.6
    # Calculate arrowhead polygon pointing clockwise
    dx = -math.sin(angle_rad)
    dy = math.cos(angle_rad)
    nx = -dy
    ny = dx

    p1 = (tip_x + dx * arrow_size, tip_y + dy * arrow_size)
    p2 = (tip_x - dx * (arrow_size * 0.4) + nx * (arrow_size * 0.9), tip_y - dy * (arrow_size * 0.4) + ny * (arrow_size * 0.9))
    p3 = (tip_x - dx * (arrow_size * 0.4) - nx * (arrow_size * 0.9), tip_y - dy * (arrow_size * 0.4) - ny * (arrow_size * 0.9))
    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))

    # Center '+' symbol in cyan/emerald/white
    plus_len = r * 0.42
    plus_w = max(int(arc_width * 0.8), 2 * scale)
    
    # Horizontal bar
    draw.rectangle(
        [cx - plus_len, cy - plus_w / 2, cx + plus_len, cy + plus_w / 2],
        fill=(56, 189, 248, 255) # Sky 400
    )
    # Vertical bar
    draw.rectangle(
        [cx - plus_w / 2, cy - plus_len, cx + plus_w / 2, cy + plus_len],
        fill=(56, 189, 248, 255) # Sky 400
    )

    # Downsample using high quality Lanczos filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

for s in sizes:
    icon = draw_icon(s)
    for d in output_dirs:
        filename = f"icon{s}.png" if s in [16, 32, 48, 128] else f"icon-{s}.png"
        icon.save(os.path.join(d, filename), format="PNG")
        if s == 128:
            icon.save(os.path.join(d, "icon.png"), format="PNG")

print("Generated all icons successfully!")
