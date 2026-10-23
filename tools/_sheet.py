import os
from PIL import Image, ImageDraw, ImageFont

root = os.path.abspath("..")
src = os.path.join(root, ".scratch", "versions")
vers = ["v50", "v51", "v52", "v53", "v54", "v55", "v56"]
labels = {
    "v50": "v50 - 23 Oct 03:10 - the counter (pale)",
    "v51": "v51 - 23 Oct 09:29 - split build, own admin page",
    "v52": "v52 - 23 Oct 09:46 - both names + CI contracts",
    "v53": "v53 - 23 Oct 10:00 - receipt readable",
    "v54": "v54 - 23 Oct 10:22 - dashboard pale",
    "v55": "v55 - 23 Oct 10:42 - live edits, checkout paints",
    "v56": "v56 - 23 Oct 20:40 - reverted to v2 palette",
}
COLW = 330
GAP = 14
LBL = 26
PAD = 14
imgs = []
for v in vers:
    im = Image.open(os.path.join(src, v + ".png")).convert("RGB")
    w, h = im.size
    nh = int(h * COLW / w)
    imgs.append((v, im.resize((COLW, nh), Image.LANCZOS), nh))

rows = [imgs[0:4], imgs[4:7]]
rowh = [max(i[2] for i in r) + LBL for r in rows]
W = PAD * 2 + 4 * COLW + 3 * GAP
H = PAD * 2 + sum(rowh) + GAP
sheet = Image.new("RGB", (W, H), (24, 22, 20))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 15)
except Exception:
    font = ImageFont.load_default()

y = PAD
for ri, row in enumerate(rows):
    x = PAD
    for (v, im, nh) in row:
        d.text((x, y), labels[v], fill=(230, 226, 218), font=font)
        sheet.paste(im, (x, y + LBL))
        x += COLW + GAP
    y += rowh[ri] + GAP

out = os.path.join(root, ".scratch", "versions-sheet.png")
sheet.save(out)
print("wrote", out, sheet.size)
