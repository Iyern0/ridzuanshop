"""Generate PWA icons for MINUM MALAM SISWA — night drink theme."""
from PIL import Image, ImageDraw

SIZE = 512
OUT = "icons"
import os
os.makedirs(OUT, exist_ok=True)

def rounded(img, radius):
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE, SIZE], radius=radius, fill=255)
    img.putalpha(mask)
    return img

# background: vertical night gradient
bg = Image.new("RGB", (SIZE, SIZE))
db = ImageDraw.Draw(bg)
top, bot = (18, 22, 48), (58, 68, 145)
for y in range(SIZE):
    t = y / SIZE
    db.line([(0, y), (SIZE, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))

img = Image.new("RGBA", (SIZE, SIZE))
img.paste(bg, (0, 0))
d = ImageDraw.Draw(img)

# stars
for x, y, r in [(118, 96, 5), (176, 210, 4), (90, 300, 4), (430, 330, 4), (300, 80, 4)]:
    d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 210))

# crescent moon (top right)
moon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
dm = ImageDraw.Draw(moon)
dm.ellipse([370, 74, 470, 174], fill=(255, 236, 170, 255))          # full moon
dm.ellipse([392, 56, 484, 148], fill=(0, 0, 0, 0))                   # carve -> crescent
img.alpha_composite(moon)

# straw (green, rotated by angle)
straw = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
ds = ImageDraw.Draw(straw)
ds.line([(256 + 30, 128), (256 + 108, 206)], fill=(43, 217, 168, 255), width=30)
img.alpha_composite(straw.rotate(0))

# lid
d.rounded_rectangle([256 - 122, 178, 256 + 122, 214], radius=16, fill=(232, 228, 216, 255))
# cup
d.rounded_rectangle([256 - 112, 196, 256 + 112, 432], radius=36, fill=(244, 242, 234, 255))
# cup rim highlight
d.rounded_rectangle([256 - 100, 208, 256 + 100, 226], radius=10, fill=(255, 255, 255, 255))
# boba pearls
for x, y in [(214, 316), (256, 336), (300, 312), (236, 366), (282, 368), (262, 300)]:
    d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(88, 58, 42, 255))

img = rounded(img, 108)

for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    print("wrote", name)
