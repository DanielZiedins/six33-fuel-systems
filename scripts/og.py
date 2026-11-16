"""Per-post 1200x630 share cards for the Journal.
   node -e "import('./content/posts.mjs').then(m=>console.log(JSON.stringify(m.POSTS)))" | python3 scripts/og.py
Writes journal/<slug>/og.jpg. Uses macOS system fonts (DIN Condensed, Menlo, Helvetica Neue)."""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIN = '/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf'
MENLO = '/System/Library/Fonts/Menlo.ttc'
ACCENT = {'ignite': (255,94,31), 'flow': (25,211,243), 'recover': (79,209,60), 'rest': (139,108,246), 'gold': (201,162,90)}
W, H = 1200, 630
logo = Image.open(os.path.join(ROOT, 'six33-logo.png')).convert('RGBA').resize((56, 56), Image.LANCZOS)

def spaced(d, xy, t, font, fill, sp):
    x, y = xy
    for ch in t:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + sp

def wrap(d, text, font, width):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= width: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur); return lines

for p in json.load(sys.stdin):
    acc = ACCENT.get(p.get('accent'), ACCENT['ignite'])
    img = Image.new('RGBA', (W, H), (5, 5, 5, 255))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-260, -220, 620, 460), fill=acc + (85,))
    ImageDraw.Draw(glow).ellipse((820, 360, 1500, 900), fill=acc + (40,))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(130)))
    # faint grid, like the site hero — drawn on its own layer and composited,
    # because ImageDraw replaces alpha instead of blending it
    grid = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(grid)
    for x in range(0, W, 64): gd.line([(x, 0), (x, H)], fill=(255, 255, 255, 14))
    for y in range(0, H, 64): gd.line([(0, y), (W, y)], fill=(255, 255, 255, 14))
    img = Image.alpha_composite(img, grid)
    d = ImageDraw.Draw(img)
    img.alpha_composite(logo, (64, 52)); d = ImageDraw.Draw(img)
    spaced(d, (134, 58), 'SIX33', ImageFont.truetype(DIN, 36), (244, 244, 245), 5)
    spaced(d, (136, 94), 'FUEL SYSTEMS · JOURNAL', ImageFont.truetype(MENLO, 14), (150, 150, 160), 4)
    spaced(d, (66, 176), p['category'].upper(), ImageFont.truetype(MENLO, 18), acc, 5)
    # fit the title: largest size that fits in ≤4 lines
    title = p['title'].upper()
    for size in range(92, 46, -4):
        f = ImageFont.truetype(DIN, size)
        lines = wrap(d, title, f, W - 140)
        if len(lines) <= 4 and len(lines) * size * 0.98 <= 330: break
    y = 214
    for ln in lines:
        d.text((64, y), ln, font=f, fill=(244, 244, 245)); y += int(size * 0.98)
    d.rectangle((66, H - 92, 66 + 84, H - 88), fill=acc)
    spaced(d, (66, H - 70), 'SIX33FUEL.COM/JOURNAL', ImageFont.truetype(MENLO, 16), (190, 190, 198), 3)
    spaced(d, (W - 262, H - 70), 'MATTHEW 6:33', ImageFont.truetype(MENLO, 16), (217, 180, 106), 4)
    out = os.path.join(ROOT, 'journal', p['slug'], 'og.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.convert('RGB').save(out, quality=86, optimize=True, progressive=True)
    print('  og', p['slug'], f'{size}px x{len(lines)}')
