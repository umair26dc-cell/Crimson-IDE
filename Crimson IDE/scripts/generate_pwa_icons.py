import zlib
import struct
import math

def create_png(width, height, get_pixel_func):
    """Generate a valid PNG file from a pixel function (x, y) -> (r, g, b, a)."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([int(r), int(g), int(b), int(a)])
    
    compressed_idat = zlib.compress(bytes(raw_data), 9)

    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    png_header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_chunk = chunk(b'IHDR', ihdr_data)
    idat_chunk = chunk(b'IDAT', compressed_idat)
    iend_chunk = chunk(b'IEND', b'')

    return png_header + ihdr_chunk + idat_chunk + iend_chunk

def crimson_icon_pixel(x, y, w, h, maskable=False):
    # Normalized coordinates (-1 to 1)
    nx = (x - w / 2.0) / (w / 2.0)
    ny = (y - h / 2.0) / (h / 2.0)
    dist = math.sqrt(nx * nx + ny * ny)

    bg_r, bg_g, bg_b, bg_a = 9, 10, 15, 255 if maskable else 0

    # Scale icon slightly inside safe zone if maskable
    scale = 0.72 if maskable else 0.88
    sx = nx / scale
    sy = ny / scale
    sdist = math.sqrt(sx * sx + sy * sy)

    # Ambient radial glow around logo
    glow = max(0.0, 1.0 - sdist)
    if not maskable:
        # Transparent background outside glow / icon
        glow_alpha = int(glow * glow * 100)
    else:
        glow_alpha = int(glow * glow * 80)

    # Base color starts as background + glow
    cr = int(bg_r + glow * 244 * (glow_alpha / 255.0))
    cg = int(bg_g + glow * 63 * (glow_alpha / 255.0))
    cb = int(bg_b + glow * 94 * (glow_alpha / 255.0))
    ca = max(bg_a, glow_alpha)

    # Geometry for CsCode 'C' Origami Code Bracket:
    # Outer circle ring between r=0.35 and r=0.75, with cutout on right (angle between -45 and 45 deg)
    angle = math.atan2(sy, sx) # -pi to pi
    deg = math.degrees(angle)

    is_c_ring = (0.28 <= sdist <= 0.76) and not (-40 <= deg <= 40)
    # Upper bracket tip
    is_top_tip = (0.35 <= sx <= 0.75) and (0.20 <= sy <= 0.48)
    # Lower bracket tip
    is_bot_tip = (0.35 <= sx <= 0.75) and (-0.48 <= sy <= -0.20)
    # Inner bracket accent (< shape)
    is_inner_apex = (-0.18 <= sx <= 0.15) and (abs(sy) <= (0.18 - sx * 0.5))

    if is_c_ring or is_top_tip or is_bot_tip:
        # Crimson gradient from top to bottom
        grad_t = (sy + 0.8) / 1.6 # 0 (top) to 1 (bottom)
        # Deep crimson rose: #fda4af (top) -> #f43f5e (mid) -> #be123c (bottom)
        r = int(254 - grad_t * 64)
        g = int(75 - grad_t * 55)
        b = int(114 - grad_t * 54)
        a = 255
        return (r, g, b, a)

    if is_inner_apex:
        # Bright neon core dot & accent
        return (255, 228, 230, 255)

    return (cr, cg, cb, ca)

# Generate assets
print("Generating PWA PNG icons...")
with open("public/pwa-192x192.png", "wb") as f:
    f.write(create_png(192, 192, lambda x, y, w, h: crimson_icon_pixel(x, y, w, h, maskable=False)))

with open("public/pwa-512x512.png", "wb") as f:
    f.write(create_png(512, 512, lambda x, y, w, h: crimson_icon_pixel(x, y, w, h, maskable=False)))

with open("public/pwa-maskable-512x512.png", "wb") as f:
    f.write(create_png(512, 512, lambda x, y, w, h: crimson_icon_pixel(x, y, w, h, maskable=True)))

with open("public/apple-touch-icon.png", "wb") as f:
    f.write(create_png(180, 180, lambda x, y, w, h: crimson_icon_pixel(x, y, w, h, maskable=True)))

with open("public/favicon.ico", "wb") as f:
    # 32x32 PNG inside favicon or direct PNG
    f.write(create_png(32, 32, lambda x, y, w, h: crimson_icon_pixel(x, y, w, h, maskable=False)))

print("PWA PNG icons generated successfully!")
