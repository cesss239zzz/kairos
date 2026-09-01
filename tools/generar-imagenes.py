#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kairos — generador de las ilustraciones de la carta.

Dibuja un SVG por platillo. Cada composición se arma a partir del nombre del
plato (el corte a la parrilla, el ceviche en copa, la cazuela de camarones, el
vaso de mojito…) y usa la misma paleta neo-noir del sitio.

Para regenerar todo:

    python3 tools/generar-imagenes.py

Escribe en assets/img/platos/ y actualiza las dos imágenes de portada.
"""

import math
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATOS = os.path.join(RAIZ, "assets", "img", "platos")
IMG = os.path.join(RAIZ, "assets", "img")

NARANJA = "#ff6600"
ROSA = "#ff3fa4"
VERDE = "#7bd44a"
AMBAR = "#ffa53d"
AZUL = "#4fc3f7"

# ---------------------------------------------------------------- utilidades

def _stops(stops):
    out = []
    for st in stops:
        extra = "" if len(st) < 3 else ' stop-opacity="%s"' % st[2]
        out.append('<stop offset="%s" stop-color="%s"%s/>' % (st[0], st[1], extra))
    return "".join(out)


def rad(pid, stops, cx="50%", cy="50%", r="60%"):
    return '<radialGradient id="%s" cx="%s" cy="%s" r="%s">%s</radialGradient>' % (
        pid, cx, cy, r, _stops(stops))


def lin(pid, stops, x1="0%", y1="0%", x2="0%", y2="100%"):
    return '<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (
        pid, x1, y1, x2, y2, _stops(stops))


def el(cx, cy, rx, ry, fill, rot=None, op=None, stroke=None, sw=None):
    a = ['<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"' % (cx, cy, rx, ry, fill)]
    if op is not None:
        a.append(' opacity="%s"' % op)
    if stroke:
        a.append(' stroke="%s" stroke-width="%s"' % (stroke, sw or 1))
    if rot is not None:
        a.append(' transform="rotate(%.1f %.1f %.1f)"' % (rot, cx, cy))
    a.append("/>")
    return "".join(a)


def path(d, fill="none", stroke=None, sw=1, op=None, cap="round", extra=""):
    a = ['<path d="%s" fill="%s"' % (d, fill)]
    if stroke:
        a.append(' stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round"' % (stroke, sw, cap))
    if op is not None:
        a.append(' opacity="%s"' % op)
    if extra:
        a.append(" " + extra)
    a.append("/>")
    return "".join(a)


def sombra(cx, cy, rx, ry, op="0.55"):
    return '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#000" opacity="%s" filter="url(#kblur)"/>' % (
        cx, cy, rx, ry, op)


def vapor(x, y, alto=70, ancho=16, op="0.16", n=3, sep=26):
    """Volutas de vapor para los platos calientes."""
    out = []
    for i in range(n):
        cx = x + (i - (n - 1) / 2.0) * sep
        h = alto * (0.75 + 0.25 * ((i + 1) % 2))
        d = "M %.1f %.1f c %.1f -%.1f %.1f -%.1f 0 -%.1f c -%.1f -%.1f -%.1f -%.1f %.1f -%.1f" % (
            cx, y, ancho, h * 0.28, -ancho, h * 0.34, h * 0.62,
            ancho * 0.9, h * 0.12, ancho * 0.5, h * 0.3, ancho * 0.35, h * 0.38)
        out.append(path(d, stroke="#ffffff", sw=3, op=op, extra='filter="url(#ksoft)"'))
    return "".join(out)

# ---------------------------------------------------------------- recipientes

def plato_oscuro(cx=320, cy=262, rx=180, ry=120, pid="pl"):
    """Cerámica oscura de la casa."""
    defs = (rad(pid, [("0%", "#33302f"), ("58%", "#1d1c1b"), ("100%", "#100f0f")], cy="34%", r="72%") +
            lin(pid + "b", [("0%", "#ffffff", "0.13"), ("100%", "#ffffff", "0")]))
    body = (
        sombra(cx, cy + ry * 0.30, rx * 1.04, ry * 0.55) +
        el(cx, cy, rx, ry, "url(#%s)" % pid, stroke="#413e3d", sw=1.5) +
        el(cx, cy + 3, rx * 0.70, ry * 0.66, "#161515", stroke="#454241", sw=1) +
        path("M %.1f %.1f a %.1f %.1f 0 0 1 %.1f 0" % (cx - rx + 4, cy - 2, rx - 4, ry - 4, 2 * (rx - 4)),
             stroke="#ffffff", sw=2, op="0.10")
    )
    return defs, body


def plato_claro(cx=320, cy=262, rx=182, ry=122, pid="pc"):
    """Porcelana clara, para pastas y postres."""
    defs = (rad(pid, [("0%", "#f4f0e9"), ("62%", "#ded7cc"), ("100%", "#b3aba1")], cy="32%", r="74%") +
            rad(pid + "i", [("0%", "#fbf8f3"), ("100%", "#ded6ca")], cy="30%", r="80%"))
    body = (
        sombra(cx, cy + ry * 0.32, rx * 1.04, ry * 0.55, "0.6") +
        el(cx, cy, rx, ry, "url(#%s)" % pid, stroke="#8f877d", sw=1.2) +
        el(cx, cy + 3, rx * 0.71, ry * 0.67, "url(#%si)" % pid, stroke="#c3bab0", sw=1) +
        path("M %.1f %.1f a %.1f %.1f 0 0 1 %.1f 0" % (cx - rx + 6, cy - 4, rx - 6, ry - 6, 2 * (rx - 6)),
             stroke="#ffffff", sw=2.5, op="0.5")
    )
    return defs, body


def tabla(cx=320, cy=258, w=340, h=210, pid="tb"):
    """Tabla de madera con veta."""
    x, y = cx - w / 2.0, cy - h / 2.0
    defs = lin(pid, [("0%", "#7a4a26"), ("45%", "#5e3719"), ("100%", "#3d2210")], x2="100%", y2="100%")
    vetas = "".join(
        path("M %.1f %.1f q %.1f -6 %.1f 0 q %.1f 7 %.1f 0" % (
            x + 16, y + 26 + i * 30, w * 0.25, w * 0.5, w * 0.25, w * 0.47 - 4),
            stroke="#2e1a0c", sw=1.4, op="0.45")
        for i in range(6))
    body = (
        sombra(cx, cy + h * 0.42, w * 0.52, h * 0.18, "0.6") +
        '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="14" fill="url(#%s)" stroke="#2b1709" stroke-width="2"/>' % (x, y, w, h, pid) +
        vetas +
        '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="14" fill="none" stroke="#c78d52" stroke-opacity=".28" stroke-width="1.5"/>' % (x + 3, y + 3, w - 6, h - 6)
    )
    return defs, body


def cazuela(cx=320, cy=262, rx=176, ry=118, pid="cz"):
    """Cazuela de hierro con asas."""
    defs = (rad(pid, [("0%", "#3a3230"), ("60%", "#221d1c"), ("100%", "#100c0c")], cy="34%", r="72%") +
            lin(pid + "m", [("0%", "#6b5a52"), ("100%", "#2a2320")], x2="100%"))
    asa = ('<rect x="%.1f" y="%.1f" width="52" height="22" rx="11" fill="url(#%sm)" stroke="#171312" stroke-width="1.5"/>' % (cx - rx - 42, cy - 11, pid) +
           '<rect x="%.1f" y="%.1f" width="52" height="22" rx="11" fill="url(#%sm)" stroke="#171312" stroke-width="1.5"/>' % (cx + rx - 10, cy - 11, pid))
    body = (
        sombra(cx, cy + ry * 0.34, rx * 1.06, ry * 0.55) +
        asa +
        el(cx, cy, rx, ry, "url(#%s)" % pid, stroke="#4a4240", sw=2) +
        el(cx, cy + 4, rx * 0.84, ry * 0.80, "#1a1514", stroke="#544a47", sw=1) +
        path("M %.1f %.1f a %.1f %.1f 0 0 1 %.1f 0" % (cx - rx + 5, cy - 3, rx - 5, ry - 5, 2 * (rx - 5)),
             stroke="#ffffff", sw=2, op="0.12")
    )
    return defs, body


def boca(cx, cy, r):
    """Borde superior del vaso, dibujado encima del líquido."""
    ry = r * 0.21
    return (el(cx, cy, r, ry, "#0d1012", op="0.35", stroke="#e2e9eb", sw=2) +
            path("M %.1f %.1f a %.1f %.1f 0 0 0 %.1f 0" % (cx - r + 4, cy, r - 4, ry - 2, 2 * (r - 4)),
                 stroke="#ffffff", sw=2, op="0.35") +
            path("M %.1f %.1f a %.1f %.1f 0 0 1 %.1f 0" % (cx - r * 0.7, cy - ry * 0.55, r * 0.7, ry, r * 0.7),
                 stroke="#ffffff", sw=1.6, op="0.28"))


def vaso_alto(cx=320, top=132, bot=392, rt=68, rb=58, pid="vh"):
    """Vaso largo (highball). Devuelve también la boca, que se dibuja al final."""
    defs = (lin(pid, [("0%", "#ffffff", "0.20"), ("18%", "#ffffff", "0.05"),
                      ("50%", "#ffffff", "0.02"), ("100%", "#ffffff", "0.12")], x2="100%", y2="0%"))
    cuerpo = "M %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Z" % (
        cx - rt, top, cx - rb, bot - 14, cx, bot + 12, cx + rb, bot - 14, cx + rt, top)
    body = (
        sombra(cx, bot + 16, rb * 1.5, 16, "0.55") +
        path(cuerpo, fill="url(#%s)" % pid, stroke="#cfd6d8", sw=1.6, op="0.9")
    )
    return defs, body, cuerpo, boca(cx, top, rt)


def vaso_rocas(cx=320, top=196, bot=372, rt=92, rb=80, pid="vr"):
    """Vaso bajo de cristal grueso."""
    defs = lin(pid, [("0%", "#ffffff", "0.22"), ("22%", "#ffffff", "0.05"),
                     ("55%", "#ffffff", "0.03"), ("100%", "#ffffff", "0.14")], x2="100%", y2="0%")
    cuerpo = "M %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Z" % (
        cx - rt, top, cx - rb, bot - 10, cx, bot + 10, cx + rb, bot - 10, cx + rt, top)
    body = (
        sombra(cx, bot + 14, rb * 1.5, 15, "0.55") +
        path(cuerpo, fill="url(#%s)" % pid, stroke="#d3dadc", sw=1.8, op="0.92") +
        # cristal grueso de la base
        path("M %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f Z" % (
            cx - rb - 2, bot - 46, cx, bot - 34, cx + rb + 2, bot - 46,
            cx + rb, bot - 10, cx, bot + 10, cx - rb, bot - 10),
            fill="#ffffff", op="0.07")
    )
    return defs, body, cuerpo, boca(cx, top, rt)


def copa_cerveza(cx=320, top=140, bot=386, rt=76, rb=52, pid="cb"):
    """Vaso cervecero cónico."""
    defs = lin(pid, [("0%", "#ffffff", "0.20"), ("20%", "#ffffff", "0.05"),
                     ("55%", "#ffffff", "0.02"), ("100%", "#ffffff", "0.13")], x2="100%", y2="0%")
    cuerpo = "M %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Z" % (
        cx - rt, top, cx - rb, bot - 12, cx, bot + 10, cx + rb, bot - 12, cx + rt, top)
    body = (sombra(cx, bot + 14, rb * 1.6, 15, "0.55") +
            path(cuerpo, fill="url(#%s)" % pid, stroke="#cfd6d8", sw=1.6, op="0.9"))
    return defs, body, cuerpo, boca(cx, top, rt)


def hielo(cx, cy, w, h, rot=0, op="0.30"):
    return ('<g transform="rotate(%.0f %.1f %.1f)" opacity="%s">' % (rot, cx, cy, op) +
            '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="6" fill="#ffffff" fill-opacity=".55" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.2"/>' % (cx - w / 2, cy - h / 2, w, h) +
            '<path d="M %.1f %.1f l %.1f %.1f" stroke="#ffffff" stroke-opacity=".9" stroke-width="2" stroke-linecap="round"/>' % (cx - w * 0.28, cy - h * 0.26, w * 0.4, h * 0.36) +
            "</g>")


def burbujas(cx, y0, y1, ancho, n=14, color="#ffffff", op="0.45"):
    out = []
    for i in range(n):
        t = (i * 0.618) % 1.0
        x = cx - ancho / 2 + ancho * t
        y = y0 + (y1 - y0) * (((i * 0.37) % 1.0))
        r = 2.0 + (i % 3)
        out.append(el(x, y, r, r, color, op=op))
    return "".join(out)


def rodaja_limon(cx, cy, r, rot=0, piel="#cfe05a", pulpa="#eaf59a", pid="rl"):
    gajos = "".join(
        path("M %.1f %.1f l %.1f %.1f" % (cx, cy,
                                          r * 0.72 * math.cos(math.radians(a)),
                                          r * 0.72 * math.sin(math.radians(a))),
             stroke="#ffffff", sw=1.4, op="0.55")
        for a in range(0, 360, 45))
    return ('<g transform="rotate(%.0f %.1f %.1f)">' % (rot, cx, cy) +
            el(cx, cy, r, r * 0.94, piel) +
            el(cx, cy, r * 0.82, r * 0.77, pulpa) +
            gajos +
            el(cx, cy, r * 0.12, r * 0.12, "#ffffff", op="0.7") +
            "</g>")


def hierbabuena(cx, cy, escala=1.0, rot=0, color="#4f9a3a", claro="#7bd44a"):
    """Ramita de hierbabuena."""
    s = escala
    hojas = []
    for dx, dy, rr, w, h in ((0, -26, 0, 15, 22), (-20, -8, -35, 14, 20), (20, -10, 35, 14, 20),
                             (-10, 12, -18, 12, 17), (12, 14, 20, 12, 17)):
        hojas.append(el(cx + dx * s, cy + dy * s, w * s, h * s, color, rot=rr,
                        stroke="#2f6522", sw=1))
        hojas.append(path("M %.1f %.1f l 0 %.1f" % (cx + dx * s, cy + (dy - h * 0.7) * s, h * 1.4 * s),
                          stroke=claro, sw=1.2 * s, op="0.65"))
    return ('<g transform="rotate(%.0f %.1f %.1f)">' % (rot, cx, cy) +
            path("M %.1f %.1f q %.1f %.1f %.1f %.1f" % (cx, cy + 34 * s, -6 * s, -18 * s, 0, -34 * s),
                 stroke="#3f7c2c", sw=3 * s) +
            "".join(hojas) + "</g>")


def perejil(cx, cy, n=7, r=13, color="#4f9a3a"):
    out = []
    for i in range(n):
        a = i * (360.0 / n)
        x = cx + r * math.cos(math.radians(a))
        y = cy + r * 0.7 * math.sin(math.radians(a))
        out.append(el(x, y, 6, 4.5, color, rot=a, op="0.95"))
    return "".join(out)

# ---------------------------------------------------------------- lienzo

MARCO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %(w)d %(h)d" width="%(w)d" height="%(h)d" role="img" aria-label="%(alt)s">
<defs>
<radialGradient id="kbg" cx="50%%" cy="40%%" r="76%%">
<stop offset="0%%" stop-color="#262322"/><stop offset="54%%" stop-color="#121111"/><stop offset="100%%" stop-color="#060606"/>
</radialGradient>
<radialGradient id="kglow" cx="50%%" cy="46%%" r="52%%">
<stop offset="0%%" stop-color="%(acc)s" stop-opacity=".28"/><stop offset="100%%" stop-color="%(acc)s" stop-opacity="0"/>
</radialGradient>
<filter id="kblur" x="-40%%" y="-40%%" width="180%%" height="180%%"><feGaussianBlur stdDeviation="%(bl).1f"/></filter>
<filter id="ksoft" x="-40%%" y="-40%%" width="180%%" height="180%%"><feGaussianBlur stdDeviation="%(sf).1f"/></filter>
%(defs)s
</defs>
<rect width="%(w)d" height="%(h)d" fill="url(#kbg)"/>
<ellipse cx="%(gx).1f" cy="%(gy).1f" rx="%(grx).1f" ry="%(gry).1f" fill="url(#kglow)"/>
<g transform="translate(%(tx).2f %(ty).2f) scale(%(s).4f)">
%(body)s
</g>
<text x="%(mx)d" y="%(my)d" text-anchor="end" font-family="Inter,system-ui,sans-serif" font-size="%(ms)d" letter-spacing="2" fill="#6b6a6a">KAIROS</text>
</svg>
"""


def escribir(ruta, alt, acento, defs, body, w=640, h=480, s=1.0):
    tx = w / 2.0 - 320 * s
    ty = h / 2.0 - 240 * s
    svg = MARCO % {
        "w": w, "h": h, "alt": alt, "acc": acento, "defs": defs, "body": body,
        "tx": tx, "ty": ty, "s": s,
        "bl": 8 * s, "sf": 3 * s,
        "gx": w / 2.0, "gy": h * 0.46, "grx": w * 0.47, "gry": h * 0.46,
        "mx": w - 16, "my": h - 14, "ms": max(12, int(13 * min(w / 640.0, h / 480.0))),
    }
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(svg)
    return svg


# ---------------------------------------------------------------- platillos
# Cada función devuelve (defs, cuerpo) dibujado sobre el lienzo base 640x480.
# El sujeto se mantiene dentro de x 95..545 / y 55..425 para que aguante los
# recortes de la ficha (16/10), la portada (1/1) y las miniaturas del panel.

def tabla_kairos():
    d, b = tabla(320, 258, 356, 214)
    d += lin("qs", [("0%", "#ffe89a"), ("100%", "#e0bc55")], x2="100%", y2="100%")
    d += lin("qs2", [("0%", "#fffbe6"), ("100%", "#f0d891")], x2="100%", y2="100%")
    d += rad("sal", [("0%", "#b8443f"), ("100%", "#7d221f")])
    d += lin("pan", [("0%", "#e8c88f"), ("55%", "#d3a663"), ("100%", "#a9743a")], y2="100%")
    d += rad("uva", [("0%", "#a984d6"), ("100%", "#5b3b84")], cx="35%", cy="30%")

    # cuñas de queso
    quesos = (
        path("M 200 196 L 268 182 L 258 232 Z", fill="url(#qs)", stroke="#a8862f", sw=1.2) +
        path("M 200 196 L 268 182 L 264 192 L 205 206 Z", fill="url(#qs2)") +
        path("M 178 232 L 246 224 L 232 268 Z", fill="url(#qs2)", stroke="#a8862f", sw=1.2) +
        el(228, 208, 4, 3, "#c9a748", op="0.8") + el(240, 200, 3, 2.5, "#c9a748", op="0.8") +
        el(212, 246, 4, 3, "#d8bb6a", op="0.8")
    )
    # salami en abanico
    salami = "".join(
        el(300 + i * 26, 206 + (i % 2) * 9, 27, 24, "url(#sal)", stroke="#5e1a17", sw=1.2, rot=-8 * i)
        for i in range(4))
    salami += "".join(el(300 + i * 26 + ((i * 7) % 13) - 6, 206 + (i % 2) * 9 + ((i * 5) % 11) - 5,
                         3.2, 3.0, "#f0d9c6", op="0.85") for i in range(8))
    # pan
    panes = (
        el(258, 300, 46, 22, "url(#pan)", rot=-9, stroke="#8d5c2c", sw=1.2) +
        el(316, 312, 44, 21, "url(#pan)", rot=6, stroke="#8d5c2c", sw=1.2) +
        el(258, 294, 34, 12, "#f0d7a8", rot=-9, op="0.55") +
        el(316, 306, 32, 11, "#f0d7a8", rot=6, op="0.55")
    )
    # uvas y aceitunas
    uvas = "".join(el(404 + (i % 3) * 21 - (i // 3) * 9, 268 + (i // 3) * 19, 12, 11.5, "url(#uva)",
                      stroke="#38214f", sw=1) for i in range(7))
    uvas += "".join(el(400 + (i % 3) * 21 - (i // 3) * 9, 264 + (i // 3) * 19, 4, 3, "#c9b3e2", op="0.5")
                    for i in range(7))
    aceitunas = "".join(el(x, y, 12, 10, "#6e8630", rot=r, stroke="#e2c98a", sw=1.2) +
                        el(x - 2, y - 2, 3.5, 3, "#8ea44a", op="0.7")
                        for x, y, r in ((392, 200, 12), (414, 214, -20), (436, 196, 30)))
    encurtidos = "".join(el(x, y, 9, 7.5, "#8fae3e", rot=r, op="0.95") for x, y, r in
                         ((186, 288, 20), (204, 300, -14), (170, 306, 34)))
    b += quesos + salami + panes + uvas + aceitunas + encurtidos
    return d, b


def ceviche():
    d, b = plato_oscuro(320, 300, 172, 104, "pcv")
    d += lin("cop", [("0%", "#ffffff", "0.16"), ("45%", "#ffffff", "0.04"),
                     ("100%", "#ffffff", "0.11")], x2="100%", y2="0%")
    d += rad("ltig", [("0%", "#fff8e6"), ("100%", "#e2cfa4")], cy="30%")
    # copa ancha y baja
    copa = "M 190 214 Q 200 314 320 322 Q 440 314 450 214 Z"
    b += path(copa, fill="url(#cop)", stroke="#dfe6e8", sw=2)
    b += '<clipPath id="ccev"><path d="%s"/></clipPath>' % copa
    b += '<g clip-path="url(#ccev)">'
    b += path("M 196 236 Q 206 306 320 314 Q 434 306 444 236 Z", fill="url(#ltig)", op="0.95")
    # camote asado
    b += "".join(path("M %.1f %.1f a 24 24 0 0 1 48 0 Z" % (x, y), fill="#f0913c", stroke="#c96d1f", sw=1.4)
                 for x, y in ((228, 292), (356, 296)))
    b += "</g>"
    # boca de la copa
    b += el(320, 214, 130, 28, "#f7edd2", op="0.55", stroke="#e6eef0", sw=2)
    b += path("M 202 210 a 118 24 0 0 0 236 0", stroke="#ffffff", sw=2, op="0.35")
    # cubos de corvina
    for x, y, r in ((262, 232, -12), (312, 218, 8), (364, 230, 18), (286, 262, 26),
                    (340, 260, -8), (388, 252, 12), (232, 258, 6)):
        b += ('<rect x="%.1f" y="%.1f" width="34" height="28" rx="6" fill="#fdfaf5" '
              'stroke="#cdc0ae" stroke-width="1.3" transform="rotate(%.0f %.1f %.1f)"/>' % (x - 17, y - 14, r, x, y))
        b += ('<rect x="%.1f" y="%.1f" width="24" height="9" rx="4" fill="#ffffff" opacity=".8" '
              'transform="rotate(%.0f %.1f %.1f)"/>' % (x - 12, y - 11, r, x, y))
    # cebolla morada, cilantro y chile dulce
    b += "".join(el(x, y, 17, 5, "#c2418f", rot=r, stroke="#8d2565", sw=1) for x, y, r in
                 ((276, 210, -18), (334, 204, 14), (372, 214, 32), (300, 242, 8), (352, 244, -24),
                  (246, 236, 22)))
    b += "".join(el(x, y, 6, 4, "#4f9a3a", rot=r) for x, y, r in
                 ((254, 246, 20), (322, 268, -10), (382, 232, 40), (296, 212, 60), (346, 224, 0),
                  (268, 274, 30)))
    b += "".join(el(x, y, 11, 4.5, "#d94f1f", rot=r, op="0.95") for x, y, r in
                 ((308, 250, 18), (368, 268, -22)))
    # gajo de limón en el borde
    b += rodaja_limon(430, 200, 28, rot=-20)
    return d, b


def alitas():
    d, b = plato_oscuro(320, 264, 180, 120, "pal")
    d += lin("gl", [("0%", "#e07a1f"), ("45%", "#a83f12"), ("100%", "#6d2409")], x2="100%", y2="100%")
    d += lin("gl2", [("0%", "#f6a94a"), ("100%", "#c25716")], x2="100%", y2="100%")
    alas = ""
    puestos = ((250, 224, -24), (306, 212, 8), (362, 226, 26), (398, 262, 62),
               (238, 274, 18), (288, 262, -12), (344, 268, 40), (300, 300, 4))
    for i, (x, y, r) in enumerate(puestos):
        g = "url(#gl2)" if i % 2 else "url(#gl)"
        alas += '<g transform="rotate(%.0f %.1f %.1f)">' % (r, x, y)
        alas += el(x, y, 33, 20, g, stroke="#4f1a06", sw=1.3)
        alas += el(x - 6, y - 6, 18, 7, "#ffc987", op="0.45")
        alas += path("M %.1f %.1f q 12 -6 24 0" % (x - 12, y + 10), stroke="#3d1304", sw=2, op="0.5")
        # huesito
        alas += el(x + 34, y + 2, 10, 6, "#e8ded0", stroke="#b8a993", sw=1)
        alas += "</g>"
    b += alas
    # ajonjolí y chile
    b += "".join(el(x, y, 3, 2.2, "#f6e7c8", rot=a, op="0.9") for x, y, a in
                 ((262, 240, 20), (300, 230, -10), (338, 250, 40), (280, 288, 8), (356, 288, 60),
                  (318, 262, 30), (386, 244, 15), (246, 258, 50)))
    b += "".join(el(x, y, 13, 5, "#c0341f", rot=r, op="0.95") for x, y, r in
                 ((392, 300, 24), (216, 244, -40)))
    b += "".join(el(x, y, 6, 4, "#4f9a3a", rot=r) for x, y, r in ((272, 306, 10), (376, 214, -25)))
    b += vapor(320, 176, 60, 14, "0.13")
    return d, b


def lomo_res():
    d, b = plato_oscuro(320, 266, 182, 122, "plo")
    d += lin("crn", [("0%", "#6b3a1c"), ("40%", "#4a230f"), ("100%", "#2c1207")], x2="100%", y2="100%")
    d += lin("crn2", [("0%", "#8a4c26"), ("100%", "#3f1d0c")], x2="20%", y2="100%")
    d += lin("pap", [("0%", "#f0c469"), ("100%", "#b9782c")], y2="100%")
    d += lin("mtq", [("0%", "#fff2c4"), ("100%", "#eccf76")], y2="100%")
    # corte grueso
    corte = ('<g transform="rotate(-8 316 254)">' +
             '<rect x="222" y="204" width="192" height="104" rx="34" fill="url(#crn)" stroke="#280f05" stroke-width="2"/>' +
             '<rect x="228" y="210" width="180" height="46" rx="26" fill="url(#crn2)" opacity=".55"/>')
    # marcas de parrilla
    for i in range(5):
        corte += path("M %d 214 l -16 88" % (252 + i * 34), stroke="#200c03", sw=8, op="0.55")
    corte += path("M 232 236 q 90 -14 176 -4", stroke="#c98a4a", sw=2.5, op="0.30")
    # canto jugoso
    corte += path("M 224 292 q 96 20 190 -6 l 0 8 q -96 26 -190 6 Z", fill="#a8422f", op="0.85")
    corte += "</g>"
    b += corte
    # mantequilla de hierbas derritiéndose
    b += el(322, 216, 34, 17, "url(#mtq)", rot=-8, stroke="#c9a544", sw=1)
    b += "".join(el(310 + i * 12, 214 + (i % 2) * 6, 4, 2.6, "#4f9a3a", rot=20 * i) for i in range(4))
    b += path("M 300 228 q 20 14 44 8", stroke="#f4dc95", sw=4, op="0.5")
    # papas rústicas
    for x, y, r in ((424, 268, 24), (446, 296, -16), (410, 302, 40)):
        b += path("M %.1f %.1f l 34 -12 l 14 26 l -30 16 Z" % (x, y), fill="url(#pap)",
                  stroke="#8a5518", sw=1.2, extra='transform="rotate(%.0f %.1f %.1f)"' % (r, x, y))
    b += "".join(el(x, y, 4, 3, "#5f9a3a", rot=r) for x, y, r in ((418, 262, 10), (452, 292, -30)))
    # romero
    b += path("M 196 300 q 34 -26 66 -34", stroke="#3f7c2c", sw=3)
    b += "".join(el(200 + i * 11, 296 - i * 6, 9, 3, "#4f9a3a", rot=-32) for i in range(6))
    b += vapor(320, 170, 66, 15, "0.14")
    return d, b


def costilla():
    d, b = plato_oscuro(320, 268, 182, 122, "pco")
    d += lin("rib", [("0%", "#7d4019"), ("40%", "#4d220c"), ("100%", "#2a1005")], x2="30%", y2="100%")
    d += rad("pur", [("0%", "#fdf5e2"), ("100%", "#d8bf8e")], cy="32%")
    d += rad("jus", [("0%", "#7a4319"), ("100%", "#2b1206")])
    # jugo de cocción y puré de yuca
    b += el(320, 296, 128, 40, "url(#jus)", op="0.85")
    b += el(318, 296, 116, 36, "url(#pur)", stroke="#c3ab7c", sw=1.4)
    b += "".join(path("M %.1f %.1f q 26 -9 52 -2" % (250 + (i % 2) * 18, 288 + i * 9),
                      stroke="#fffaf0", sw=4, op="0.45") for i in range(3))
    b += el(318, 286, 74, 14, "#fffaf0", op="0.35")
    # costilla glaseada
    b += ('<g transform="rotate(-6 312 230)">' +
          path("M 216 196 q 8 -22 44 -22 l 108 0 q 34 0 40 22 l 0 46 q -6 26 -44 28 l -104 2 "
               "q -38 -2 -44 -28 Z", fill="url(#rib)", stroke="#200c04", sw=2) +
          path("M 232 206 q 82 -14 152 -2", stroke="#d8934a", sw=5, op="0.38") +
          path("M 228 242 q 88 18 160 2", stroke="#1c0903", sw=6, op="0.5") +
          el(292, 212, 44, 11, "#eaa868", op="0.28") +
          "".join(path("M %d 190 q 6 34 0 68" % (260 + i * 34), stroke="#2c1207", sw=3, op="0.4")
                  for i in range(4)) +
          path("M 236 262 q 84 16 152 0", stroke="#c07a3a", sw=3, op="0.3") +
          "</g>")
    b += "".join(el(x, y, 5, 3.4, "#4f9a3a", rot=r) for x, y, r in
                 ((250, 300, 20), (356, 312, -14), (408, 292, 40), (296, 316, 8)))
    b += el(404, 306, 6, 4, "#c0341f", op="0.9")
    b += vapor(316, 158, 62, 15, "0.13")
    return d, b


def pollo_brasa():
    d, b = plato_oscuro(320, 266, 182, 122, "ppo")
    d += rad("pol", [("0%", "#f0b45e"), ("52%", "#c9782a"), ("100%", "#8a4913")], cx="42%", cy="34%")
    d += lin("tor", [("0%", "#f4e3bd"), ("100%", "#d8bd84")], y2="100%")
    # medio pollo
    b += ('<g transform="rotate(-10 300 240)">' +
          path("M 214 246 q 6 -68 92 -76 q 90 -8 106 58 q 8 52 -62 66 q -84 16 -122 -8 q -18 -14 -14 -40 Z",
               fill="url(#pol)", stroke="#6d3a0e", sw=2) +
          path("M 244 216 q 62 -28 130 -6", stroke="#ffd79b", sw=5, op="0.30") +
          "".join(path("M %d 224 q 10 22 2 44" % (256 + i * 30), stroke="#7a3f10", sw=3.5, op="0.45")
                  for i in range(5)) +
          el(290, 258, 30, 12, "#7d3d0d", op="0.35") +
          # muslo
          path("M 388 268 q 34 6 44 30 q -6 16 -26 12 q -22 -6 -30 -26 Z", fill="url(#pol)",
               stroke="#6d3a0e", sw=1.6) +
          el(434, 300, 13, 8, "#eee5d6", stroke="#b9ab95", sw=1.2) +
          "</g>")
    # tortillas
    b += el(206, 306, 48, 18, "url(#tor)", rot=-8, stroke="#b99a62", sw=1.2)
    b += el(206, 296, 48, 18, "url(#tor)", rot=-4, stroke="#b99a62", sw=1.2)
    b += "".join(el(196 + i * 14, 292 + (i % 2) * 4, 4, 3, "#a9843f", op="0.6") for i in range(4))
    # ensalada tibia
    b += "".join(el(x, y, 17, 9, "#4f9a3a", rot=r, op="0.95") for x, y, r in
                 ((408, 214, -24), (436, 232, 18), (400, 240, 40)))
    b += el(424, 222, 9, 8, "#c0341f")
    b += el(420, 244, 8, 7, "#c0341f", op="0.9")
    b += vapor(310, 160, 62, 14, "0.13")
    return d, b


def camarones_ajillo():
    d, b = cazuela(320, 268, 172, 116, "cza")
    d += rad("aceite", [("0%", "#f5c05a"), ("60%", "#d98f22"), ("100%", "#9c5c10")], cy="34%", r="70%")
    d += lin("cam", [("0%", "#ff9d7a"), ("45%", "#f2683f"), ("100%", "#c4341c")], x2="60%", y2="100%")
    d += lin("tost", [("0%", "#eccb92"), ("100%", "#b57f38")], y2="100%")
    # aceite burbujeante
    b += el(320, 270, 138, 88, "url(#aceite)", op="0.92")
    b += "".join(el(320 + math.cos(math.radians(i * 47)) * (30 + i * 5),
                    270 + math.sin(math.radians(i * 47)) * (18 + i * 3),
                    3 + (i % 3), 2.4 + (i % 3) * 0.7, "#ffe6a8", op="0.55") for i in range(14))
    # camarones en C
    for x, y, r in ((266, 236, -20), (330, 224, 14), (384, 250, 40), (258, 292, 26),
                    (322, 296, -8), (378, 300, 54)):
        b += ('<g transform="rotate(%.0f %.1f %.1f)">' % (r, x, y) +
              path("M %.1f %.1f a 26 24 0 1 1 6 -30 l -10 8 a 16 15 0 1 0 -4 18 Z" % (x + 12, y + 14),
                   fill="url(#cam)", stroke="#8f2411", sw=1.4) +
              path("M %.1f %.1f l 16 -10 l -2 12 Z" % (x + 14, y + 16), fill="#e0512c", stroke="#8f2411", sw=1) +
              path("M %.1f %.1f a 20 18 0 0 1 4 -22" % (x + 6, y + 8), stroke="#ffd0b8", sw=2.5, op="0.55") +
              "</g>")
    # ajo confitado y perejil
    b += "".join(el(x, y, 12, 8, "#f7edd6", rot=r, stroke="#cbb894", sw=1) for x, y, r in
                 ((300, 258, 18), (352, 276, -22), (286, 316, 8), (400, 226, 34), (238, 262, -40)))
    b += perejil(310, 210) + perejil(392, 320, n=6, r=10)
    # pan tostado apoyado
    b += el(196, 254, 44, 20, "url(#tost)", rot=-28, stroke="#8d5c2c", sw=1.2)
    b += el(214, 292, 42, 19, "url(#tost)", rot=-16, stroke="#8d5c2c", sw=1.2)
    b += vapor(320, 168, 62, 15, "0.14")
    return d, b


def filete_pescado():
    d, b = plato_oscuro(320, 268, 182, 122, "pfi")
    d += lin("pes", [("0%", "#fdfaf5"), ("60%", "#eee5d8"), ("100%", "#c9b9a6")], y2="100%")
    d += lin("piel", [("0%", "#f0c169"), ("45%", "#c98b30"), ("100%", "#8a5613")], y2="100%")
    d += rad("arr", [("0%", "#fffaf0"), ("100%", "#ddd0b6")], cy="32%")
    # arroz cremoso
    b += path("M 212 296 q 32 -46 86 -34 q 44 10 44 32 q 0 28 -54 32 q -62 4 -78 -30 Z",
              fill="url(#arr)", stroke="#c9bda3", sw=1.4)
    b += "".join(el(230 + (i * 19) % 92, 280 + (i * 13) % 30, 4.5, 3, "#ffffff", rot=i * 25, op="0.7")
                 for i in range(13))
    # filete con piel crujiente
    b += ('<g transform="rotate(-11 330 224)">' +
          path("M 240 224 q 58 -40 140 -24 q 46 10 42 36 q -4 26 -62 30 q -82 6 -114 -14 q -16 -12 -6 -28 Z",
               fill="url(#pes)", stroke="#b3a48f", sw=1.6) +
          # piel dorada, ancha, sobre la mitad superior
          path("M 244 218 q 58 -38 138 -22 q 44 8 42 30 q -30 -18 -84 -20 q -60 -2 -96 12 Z",
               fill="url(#piel)", stroke="#6d4a10", sw=1.4) +
          "".join(path("M %d 198 q 6 10 2 20" % (272 + i * 24), stroke="#7d5416", sw=2.5, op="0.6")
                  for i in range(5)) +
          path("M 258 206 q 62 -24 122 -8", stroke="#ffe0a3", sw=3, op="0.45") +
          # lascas del pescado
          "".join(path("M %d 240 q 4 14 -2 22" % (268 + i * 26), stroke="#cdbca8", sw=2, op="0.85")
                  for i in range(5)) +
          path("M 256 254 q 70 16 126 0", stroke="#ffffff", sw=3, op="0.5") +
          "</g>")
    # vegetales grillados
    for x, y in ((418, 292), (444, 264)):
        b += el(x, y, 20, 19, "#6ea83c", stroke="#3f6b1e", sw=1.4)
        b += el(x, y, 11, 10, "#cfe6a8", op="0.8")
        b += path("M %.1f %.1f l 30 6" % (x - 15, y - 8), stroke="#2f4f14", sw=3, op="0.6")
    b += el(398, 236, 17, 16, "#c8331f", stroke="#7d1f11", sw=1.2)
    b += el(394, 230, 6, 5, "#ff8f6a", op="0.7")
    b += rodaja_limon(214, 232, 25, rot=14)
    b += vapor(330, 166, 58, 14, "0.12")
    return d, b


def pasta_pesto():
    d, b = plato_claro(320, 266, 182, 122, "ppe")
    d += lin("fid", [("0%", "#a8c85a"), ("100%", "#5d8a29")], x2="100%")
    # nido de linguini
    nido = ""
    for i in range(26):
        a = i * 13.8
        rx = 74 - (i % 5) * 7
        ry = 44 - (i % 5) * 4
        nido += ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="%s" '
                 'stroke-width="5" stroke-opacity=".92" transform="rotate(%.0f 320 258)"/>' % (
                     320 + math.cos(math.radians(a)) * 8, 258 + math.sin(math.radians(a)) * 5,
                     rx, ry, "#8bb246" if i % 2 else "#6f9a33", a))
    b += el(320, 262, 92, 56, "#4d7322", op="0.55")
    b += nido
    b += "".join(path("M %.1f %.1f q 30 -14 60 -2" % (250 + (i % 3) * 30, 232 + i * 9),
                      stroke="#b6d071", sw=3, op="0.55") for i in range(4))
    # tomates confitados y parmesano
    for x, y in ((262, 232), (376, 246), (300, 300), (368, 296)):
        b += el(x, y, 17, 15, "#c8331f", stroke="#7d1f11", sw=1.3)
        b += el(x - 5, y - 5, 6, 4.5, "#ff8f6a", op="0.7")
    b += "".join(path("M %.1f %.1f l 26 -8 l 4 9 l -26 8 Z" % (x, y), fill="#f6ecd2",
                      stroke="#cbbb94", sw=1, extra='transform="rotate(%.0f %.1f %.1f)"' % (r, x, y))
                 for x, y, r in ((242, 274, -18), (352, 214, 22), (396, 274, 40)))
    # albahaca
    b += "".join(el(x, y, 16, 11, "#3f8a2a", rot=r, stroke="#2b5f1c", sw=1) for x, y, r in
                 ((320, 206, -10), (232, 254, 30), (404, 240, -34)))
    b += vapor(320, 162, 58, 14, "0.12")
    return d, b


def fettuccine():
    d, b = plato_oscuro(320, 266, 182, 122, "pfe")
    d += lin("alf", [("0%", "#fbf1d9"), ("100%", "#dcc79a")], x2="100%")
    b += el(320, 268, 96, 58, "#c9b489", op="0.45")
    b += el(320, 258, 44, 26, "#efdfbc")
    cintas = ""
    for i in range(22):
        a = i * 16.4
        rx = 76 - (i % 4) * 8
        ry = 46 - (i % 4) * 5
        cintas += ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="%s" '
                   'stroke-width="8" stroke-opacity=".95" transform="rotate(%.0f 320 258)"/>' % (
                       320 + math.cos(math.radians(a)) * 7, 258 + math.sin(math.radians(a)) * 4,
                       rx, ry, "#f7ead0" if i % 2 else "#e3d0a8", a))
    b += cintas
    b += "".join(path("M %.1f %.1f q 22 -12 44 -2" % (296 + (i % 2) * 12, 246 + i * 9),
                      stroke="#f7ead0", sw=7, op="0.95") for i in range(3))
    b += path("M 258 240 q 62 -22 124 -4", stroke="#fffaf0", sw=5, op="0.5")
    # salsa, parmesano y pimienta
    b += el(320, 288, 62, 20, "#fff8e8", op="0.35")
    b += "".join(el(x, y, 2.6, 2.2, "#2b2523", rot=0, op="0.85") for x, y in
                 ((286, 240), (330, 228), (358, 258), (300, 276), (352, 288), (268, 266),
                  (318, 252), (378, 240)))
    b += "".join(path("M %.1f %.1f l 24 -7 l 4 9 l -24 7 Z" % (x, y), fill="#fdf6e4",
                      stroke="#cbbb94", sw=1, extra='transform="rotate(%.0f %.1f %.1f)"' % (r, x, y))
                 for x, y, r in ((240, 236, -22), (372, 292, 26)))
    b += "".join(el(x, y, 6, 4, "#4f9a3a", rot=r) for x, y, r in ((304, 214, 12), (368, 218, -30)))
    b += vapor(320, 160, 58, 14, "0.13")
    return d, b


def volcan_chocolate():
    d, b = plato_claro(320, 272, 178, 118, "pvo")
    d += lin("choc", [("0%", "#5b3320"), ("48%", "#3a1d10"), ("100%", "#21100a")], x2="100%", y2="100%")
    d += lin("lava", [("0%", "#8a4a22"), ("100%", "#4b2410")], y2="100%")
    d += rad("hel", [("0%", "#fffdf7"), ("62%", "#f4ecdc"), ("100%", "#d9cdb6")], cx="38%", cy="30%")
    # lava derramada
    b += path("M 236 292 q 44 34 96 24 q 60 -12 82 -32 q 6 26 -34 40 q -76 24 -128 0 q -22 -12 -16 -32 Z",
              fill="url(#lava)", op="0.95")
    # bizcocho
    b += path("M 244 216 q 0 -22 62 -22 q 62 0 62 22 l 0 66 q 0 24 -62 24 q -62 0 -62 -24 Z",
              fill="url(#choc)", stroke="#190b06", sw=2)
    b += el(306, 216, 62, 20, "#4a2716", stroke="#190b06", sw=1.5)
    # centro líquido
    b += el(306, 218, 34, 12, "#8a4a22")
    b += path("M 286 224 q 20 40 62 44 q 18 4 26 -6 q -12 22 -44 18 q -46 -8 -60 -50 Z",
              fill="#7a3f1c", op="0.95")
    b += path("M 296 226 q 14 30 46 38", stroke="#c07a3a", sw=4, op="0.45")
    # helado de vainilla
    b += el(410, 262, 44, 40, "url(#hel)", stroke="#c9bda3", sw=1.4)
    b += el(398, 250, 15, 11, "#ffffff", op="0.6")
    b += path("M 380 288 q 30 16 60 0", stroke="#d9cdb6", sw=3, op="0.7")
    b += hierbabuena(412, 224, 0.5, 8)
    # cacao espolvoreado
    b += "".join(el(x, y, 2.4, 2, "#4a2716", op="0.6") for x, y in
                 ((236, 306), (268, 318), (356, 312), (392, 308), (208, 288), (430, 300)))
    return d, b


def tres_leches():
    d, b = plato_oscuro(320, 274, 176, 116, "ptl")
    d += lin("biz", [("0%", "#f7e6bd"), ("55%", "#eed49a"), ("100%", "#d7b671")], y2="100%")
    d += lin("cre", [("0%", "#fffdf8"), ("100%", "#eae0cd")], y2="100%")
    d += lin("dul", [("0%", "#c8813a"), ("100%", "#8f5218")], y2="100%")
    # charco de dulce de leche
    b += el(320, 300, 108, 22, "url(#dul)", op="0.75")
    # rebanada (vista de canto)
    b += ('<g transform="translate(0 -6)">' +
          path("M 226 292 L 226 216 L 414 200 L 414 276 Z", fill="url(#biz)", stroke="#b58d4a", sw=1.6) +
          path("M 226 246 L 414 230", stroke="#e0be7d", sw=3, op="0.7") +
          path("M 226 268 L 414 252", stroke="#e0be7d", sw=3, op="0.55") +
          # remojado abajo
          path("M 226 292 L 226 274 L 414 258 L 414 276 Z", fill="#e3c489", op="0.8") +
          # crema arriba
          path("M 222 218 q 30 -26 96 -30 q 66 -4 98 12 l 0 20 L 226 236 Z", fill="url(#cre)",
               stroke="#d5c9b1", sw=1.4) +
          "".join(el(248 + i * 34, 208 - (i % 2) * 6, 20, 13, "#fffdf8", stroke="#e2d8c4", sw=1)
                  for i in range(5)) +
          "</g>")
    # frutos rojos
    b += path("M 396 236 q 16 -10 26 4 q 10 16 -8 26 q -20 10 -26 -8 q -4 -14 8 -22 Z",
              fill="#c02744", stroke="#7d1226", sw=1.2)
    b += path("M 400 232 q 8 -12 18 -6", stroke="#4f9a3a", sw=3)
    for x, y in ((238, 258), (262, 300), (368, 296)):
        b += "".join(el(x + (i % 3) * 8 - 8, y + (i // 3) * 8 - 4, 5, 4.6, "#b0203c", op="0.95")
                     for i in range(6))
    b += path("M 250 226 q 26 -16 54 -10", stroke="#8f5218", sw=3, op="0.5")
    return d, b


def limonada():
    d, b, cuerpo, borde = vaso_alto(320, 128, 396, 70, 60, "vli")
    d += lin("liq", [("0%", "#eaf7a8"), ("50%", "#cbe86a"), ("100%", "#9dc63c")], y2="100%")
    d += '<clipPath id="clim"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#clim)">'
    b += '<rect x="240" y="176" width="160" height="230" fill="url(#liq)"/>'
    b += hielo(292, 218, 44, 40, -12, "0.42") + hielo(348, 254, 42, 38, 18, "0.38")
    b += hielo(300, 296, 40, 36, 26, "0.34") + hielo(346, 336, 38, 34, -8, "0.30")
    b += burbujas(320, 200, 380, 96, 18, "#ffffff", "0.35")
    b += rodaja_limon(286, 300, 30, rot=-18)
    b += rodaja_limon(354, 216, 28, rot=24)
    b += "".join(el(x, y, 9, 6, "#4f9a3a", rot=r, op="0.9") for x, y, r in
                 ((300, 350, 20), (346, 300, -30)))
    b += el(320, 176, 68, 14, "#dff09a", op="0.9")
    b += "</g>"
    b += borde
    b += path("M 356 130 L 336 186", stroke="#ff6600", sw=9, op="0.85", cap="round")
    b += path("M 356 130 L 336 186", stroke="#ffb596", sw=3, op="0.6", cap="round")
    b += hierbabuena(288, 138, 0.9, -14)
    b += rodaja_limon(384, 158, 26, rot=32)
    # condensación
    b += "".join(el(268 + (i * 23) % 108, 214 + (i * 37) % 156, 2.6, 3.4, "#ffffff", op="0.22")
                 for i in range(18))
    return d, b


def cafe():
    d = (lin("prens", [("0%", "#ffffff", "0.18"), ("40%", "#ffffff", "0.04"), ("100%", "#ffffff", "0.12")], x2="100%", y2="0%") +
         lin("met", [("0%", "#cfd4d6"), ("45%", "#7d8487"), ("100%", "#4a4f52")], x2="100%") +
         lin("caf", [("0%", "#6b3a1c"), ("60%", "#3d1f0d"), ("100%", "#1f0f06")], y2="100%") +
         rad("tza", [("0%", "#f6f2ea"), ("100%", "#cdc4b6")], cx="36%", cy="28%"))
    b = sombra(300, 400, 190, 20, "0.5")
    # prensa francesa
    b += '<rect x="200" y="180" width="132" height="196" rx="14" fill="url(#prens)" stroke="#c9d0d2" stroke-width="1.8"/>'
    b += '<rect x="206" y="238" width="120" height="132" rx="10" fill="url(#caf)"/>'
    b += el(266, 240, 60, 11, "#8a5228", op="0.85")
    b += "".join(el(230 + (i * 29) % 76, 250 + (i * 13) % 8, 4, 3, "#c08a52", op="0.5") for i in range(6))
    b += '<rect x="192" y="164" width="148" height="24" rx="10" fill="url(#met)" stroke="#3d4245" stroke-width="1.4"/>'
    b += '<rect x="256" y="128" width="20" height="42" rx="8" fill="url(#met)" stroke="#3d4245" stroke-width="1.4"/>'
    b += el(266, 126, 26, 11, "url(#met)", stroke="#3d4245", sw=1.4)
    b += '<rect x="212" y="228" width="108" height="10" rx="5" fill="#9aa1a4" opacity=".75"/>'
    b += '<rect x="326" y="212" width="42" height="86" rx="18" fill="none" stroke="#8d9497" stroke-width="9" opacity=".8"/>'
    b += path("M 214 196 L 214 366", stroke="#ffffff", sw=4, op="0.16")
    # taza
    b += el(432, 330, 62, 24, "#9c948a", op="0.35")
    b += path("M 380 292 q 4 46 52 48 q 48 -2 52 -48 Z", fill="url(#tza)", stroke="#a9a094", sw=1.6)
    b += el(432, 292, 52, 17, "url(#tza)", stroke="#a9a094", sw=1.4)
    b += el(432, 292, 43, 13, "#3d1f0d")
    b += el(432, 291, 34, 9, "#8a5228", op="0.65")
    b += el(424, 289, 13, 4, "#c9a071", op="0.7")
    b += path("M 484 300 q 26 4 22 24 q -4 18 -26 14", stroke="#cdc4b6", sw=6, op="0.95")
    # granos
    for x, y, r in ((196, 402, -18), (232, 412, 24), (500, 388, 12), (528, 406, -30), (466, 404, 40)):
        b += el(x, y, 13, 9, "#4a2716", rot=r, stroke="#2c150b", sw=1)
        b += path("M %.1f %.1f q 4 8 0 16" % (x, y - 8), stroke="#2c150b", sw=1.6,
                  extra='transform="rotate(%.0f %.1f %.1f)"' % (r, x, y))
    b += vapor(432, 262, 60, 14, "0.18")
    b += vapor(266, 150, 44, 12, "0.10", n=2, sep=22)
    return d, b


def gaseosa_agua():
    d = (lin("bot", [("0%", "#ffffff", "0.26"), ("30%", "#ffffff", "0.06"),
                     ("70%", "#ffffff", "0.04"), ("100%", "#ffffff", "0.18")], x2="100%", y2="0%") +
         lin("agua", [("0%", "#8fd6f2"), ("100%", "#2f8fc4")], y2="100%") +
         lin("tapa", [("0%", "#ff8a3d"), ("100%", "#c14a0c")], y2="100%") +
         lin("vas", [("0%", "#ffffff", "0.20"), ("50%", "#ffffff", "0.04"), ("100%", "#ffffff", "0.14")], x2="100%", y2="0%"))
    cuerpo = ("M 214 178 q 0 -16 14 -22 l 0 -22 l 36 0 l 0 22 q 14 6 14 22 l 0 190 "
              "q 0 18 -32 18 q -32 0 -32 -18 Z")
    b = sombra(300, 400, 180, 20, "0.5")
    b += path(cuerpo, fill="url(#bot)", stroke="#cfd8dc", sw=1.8)
    b += '<clipPath id="cbot"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#cbot)"><rect x="204" y="212" width="92" height="180" fill="url(#agua)" opacity=".85"/>'
    b += burbujas(250, 224, 380, 60, 14, "#ffffff", "0.5") + "</g>"
    b += '<rect x="228" y="122" width="36" height="20" rx="5" fill="url(#tapa)" stroke="#8f3606" stroke-width="1.4"/>'
    b += '<rect x="212" y="248" width="76" height="64" rx="8" fill="#0f1416" opacity=".55"/>'
    b += '<text x="250" y="288" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="#ff8a3d">500</text>'
    b += '<text x="250" y="304" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="11" letter-spacing="4" fill="#c4c7c7">ML</text>'
    b += path("M 224 196 L 224 356", stroke="#ffffff", sw=5, op="0.18")
    # vaso con hielo
    vaso = "M 352 208 L 362 372 Q 406 384 450 372 L 460 208 Z"
    b += path(vaso, fill="url(#vas)", stroke="#cfd8dc", sw=1.6)
    b += '<clipPath id="cvas"><path d="%s"/></clipPath>' % vaso
    b += '<g clip-path="url(#cvas)"><rect x="346" y="238" width="122" height="150" fill="url(#agua)" opacity=".75"/>'
    b += hielo(388, 268, 40, 36, -14, "0.45") + hielo(428, 302, 38, 34, 20, "0.4")
    b += hielo(394, 336, 36, 32, 8, "0.35")
    b += burbujas(406, 250, 366, 76, 16, "#ffffff", "0.45") + "</g>"
    b += el(406, 238, 54, 12, "#bfe6f6", stroke="#ffffff", sw=1.2, op="0.85")
    b += el(406, 208, 54, 12, "#ffffff", op="0.10", stroke="#dfe8ec", sw=1.4)
    return d, b


def mojito():
    d, b, cuerpo, borde = vaso_alto(320, 126, 394, 70, 60, "vmo")
    d += lin("moj", [("0%", "#e8f8c4"), ("55%", "#bfe583"), ("100%", "#84b845")], y2="100%")
    d += '<clipPath id="cmoj"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#cmoj)">'
    b += '<rect x="240" y="170" width="160" height="236" fill="url(#moj)"/>'
    b += hielo(296, 206, 34, 30, -18, "0.5") + hielo(342, 232, 32, 28, 22, "0.45")
    b += hielo(298, 262, 33, 29, 10, "0.42") + hielo(348, 292, 31, 27, -14, "0.4")
    b += hielo(300, 326, 30, 26, 30, "0.36") + hielo(340, 358, 29, 25, 6, "0.32")
    b += "".join(el(x, y, 14, 9, "#3f8a2a", rot=r, op="0.92") for x, y, r in
                 ((288, 244, 24), (352, 322, -18), (306, 350, 40), (344, 196, 12)))
    b += rodaja_limon(292, 302, 27, rot=-24)
    b += rodaja_limon(352, 264, 25, rot=30)
    b += burbujas(320, 190, 380, 96, 22, "#ffffff", "0.4")
    b += el(320, 170, 68, 14, "#d6ee9e", op="0.9")
    b += "</g>"
    b += borde
    b += path("M 348 118 L 332 182", stroke="#ff3fa4", sw=9, op="0.9", cap="round")
    b += path("M 348 118 L 332 182", stroke="#ffb0d8", sw=3, op="0.6", cap="round")
    b += hierbabuena(292, 130, 1.05, -16)
    b += hierbabuena(344, 144, 0.65, 22)
    b += rodaja_limon(384, 172, 24, rot=-30)
    b += "".join(el(266 + (i * 27) % 110, 210 + (i * 41) % 162, 2.6, 3.4, "#ffffff", op="0.2")
                 for i in range(16))
    return d, b


def old_fashioned():
    d, b, cuerpo, borde = vaso_rocas(320, 194, 372, 94, 82, "vof")
    d += lin("whi", [("0%", "#f0a63a"), ("45%", "#c06a12"), ("100%", "#8a3f07")], y2="100%")
    d += '<clipPath id="cof"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#cof)">'
    b += '<rect x="222" y="240" width="196" height="146" fill="url(#whi)"/>'
    b += path("M 226 246 q 94 22 190 -4 l 0 12 q -96 26 -190 4 Z", fill="#ffd08a", op="0.35")
    # hielo grande dentro del vaso
    b += ('<g transform="rotate(-8 322 286)">' +
          '<rect x="274" y="234" width="98" height="94" rx="12" fill="#ffffff" fill-opacity=".30" stroke="#ffffff" stroke-opacity=".72" stroke-width="2"/>' +
          path("M 290 256 l 32 28 l -18 30", stroke="#ffffff", sw=3, op="0.55") +
          path("M 350 252 l -20 24", stroke="#ffffff", sw=2.5, op="0.4") +
          "</g>")
    b += el(320, 240, 92, 17, "#e59a30", op="0.9")
    b += el(316, 238, 44, 8, "#ffd9a3", op="0.4")
    b += "</g>"
    b += borde
    # cáscara de naranja sobre el borde
    b += path("M 352 216 q 44 -12 52 20 q 6 28 -24 34 q -24 4 -30 -16 q -4 -18 16 -22 q 16 -2 12 12",
              stroke="#f08a1e", sw=10, op="0.95")
    b += path("M 352 216 q 44 -12 52 20 q 6 28 -24 34", stroke="#ffd9a3", sw=3, op="0.5")
    # cereza
    b += el(266, 224, 17, 16, "#a01530", stroke="#5e0a1c", sw=1.2)
    b += el(261, 219, 5, 4, "#ff7d94", op="0.65")
    b += path("M 266 210 q 6 -24 24 -28", stroke="#4f7c2c", sw=2.6)
    return d, b


def michelada():
    d, b, cuerpo, borde = copa_cerveza(320, 136, 388, 78, 54, "vmi")
    d += lin("mic", [("0%", "#e8712a"), ("45%", "#c2400f"), ("100%", "#8a2607")], y2="100%")
    d += '<clipPath id="cmi"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#cmi)">'
    b += '<rect x="238" y="186" width="164" height="212" fill="url(#mic)"/>'
    b += burbujas(320, 210, 376, 104, 26, "#ffd9a3", "0.4")
    b += "</g>"
    b += borde
    # espuma
    b += "".join(el(258 + i * 21, 184 - (i % 3) * 7, 17, 12, "#fdf3e0", stroke="#e6d4b6", sw=1)
                 for i in range(7))
    b += el(320, 190, 74, 14, "#fffaf0", op="0.85")
    # escarchado de tajín sobre el borde
    b += path("M 242 136 q 78 26 156 0 q -6 -18 -14 -20 q -64 20 -128 0 q -8 2 -14 20 Z",
              fill="#c0341f", op="0.92")
    b += "".join(el(250 + (i * 19) % 142, 138 + ((i * 7) % 5) * 3, 4.5, 4, "#e0522a", op="0.9")
                 for i in range(22))
    b += "".join(el(254 + (i * 23) % 134, 144 + ((i * 11) % 4) * 3, 3.5, 3, "#f0a53d", op="0.85")
                 for i in range(16))
    # gajo de limón en el borde
    b += rodaja_limon(392, 142, 28, rot=26)
    b += path("M 250 210 L 262 360", stroke="#ffffff", sw=5, op="0.15")
    return d, b


def ensalada():
    d, b = plato_claro(320, 266, 180, 120, "pen")
    d += rad("bol", [("0%", "#2e2b2a"), ("100%", "#151313")], cy="30%")
    b += el(320, 262, 128, 84, "url(#bol)", stroke="#403c3a", sw=1.5)
    hojas = ""
    for i, (x, y, r, w, h, c) in enumerate((
            (272, 236, -22, 40, 26, "#4f9a3a"), (330, 224, 16, 42, 27, "#5faa42"),
            (372, 252, 38, 38, 25, "#3f8a2a"), (268, 286, 24, 39, 25, "#5faa42"),
            (326, 292, -12, 43, 26, "#4f9a3a"), (378, 296, 52, 36, 23, "#69b84c"),
            (300, 260, 6, 40, 25, "#3f8a2a"), (352, 272, -34, 37, 24, "#5faa42"))):
        hojas += el(x, y, w, h, c, rot=r, stroke="#2b5f1c", sw=1.2)
        hojas += path("M %.1f %.1f q %.1f 0 %.1f 0" % (x - w * 0.7, y, w * 0.7, w * 1.4),
                      stroke="#a8d98a", sw=1.6, op="0.4")
    b += hojas
    for x, y in ((288, 246), (356, 230), (300, 300), (368, 282)):
        b += el(x, y, 16, 15, "#c8331f", stroke="#7d1f11", sw=1.2)
        b += el(x - 5, y - 5, 5.5, 4.5, "#ff8f6a", op="0.7")
    b += "".join(el(x, y, 15, 14, "#cfe6a8", rot=r, stroke="#9dbd76", sw=1) + el(x, y, 7, 6, "#eaf6d2")
                 for x, y, r in ((332, 256, 12), (270, 268, -20), (386, 262, 30)))
    b += "".join('<rect x="%.1f" y="%.1f" width="20" height="16" rx="3" fill="#fbf6ea" stroke="#ddd2bd" stroke-width="1" transform="rotate(%.0f %.1f %.1f)"/>' % (x, y, r, x + 10, y + 8)
                 for x, y, r in ((296, 268, 14), (344, 240, -18), (312, 226, 30)))
    return d, b


def sopa():
    d, b = plato_claro(320, 268, 180, 120, "pso")
    d += rad("cal", [("0%", "#f0a53d"), ("55%", "#c96d1f"), ("100%", "#8f4610")], cy="34%", r="70%")
    b += el(320, 266, 132, 86, "#2a2523", stroke="#443e3b", sw=1.5)
    b += el(320, 266, 120, 76, "url(#cal)")
    b += el(310, 250, 56, 24, "#ffcf85", op="0.35")
    # tropiezos
    b += "".join(el(x, y, 13, 10, c, rot=r, op="0.95") for x, y, r, c in
                 ((280, 254, 20, "#e8c07a"), (346, 246, -14, "#c8331f"), (300, 288, 34, "#5faa42"),
                  (362, 288, 8, "#e8c07a"), (330, 268, -30, "#a8541c"), (262, 282, 44, "#5faa42")))
    b += "".join(el(x, y, 4.5, 3.5, "#e8f0c0", rot=r, op="0.9") for x, y, r in
                 ((296, 266, 10), (352, 272, 40), (318, 244, -20), (338, 296, 24)))
    b += "".join(el(x, y, 7, 5, "#ffe9b8", rot=r, op="0.55") for x, y, r in
                 ((272, 268, 0), (376, 262, 20)))
    b += vapor(320, 214, 84, 20, "0.2")
    return d, b


def hamburguesa():
    d, b = plato_oscuro(320, 286, 180, 112, "pha")
    d += lin("pan1", [("0%", "#f0c479"), ("100%", "#c68b36")], y2="100%")
    d += lin("carn", [("0%", "#6b3a1c"), ("100%", "#2f150a")], y2="100%")
    d += lin("ques", [("0%", "#ffcf5c"), ("100%", "#e09a1c")], y2="100%")
    b += path("M 210 200 q 8 -66 110 -66 q 102 0 110 66 q 4 16 -22 16 l -176 0 q -26 0 -22 -16 Z",
              fill="url(#pan1)", stroke="#9a681f", sw=1.6)
    b += "".join(el(258 + (i * 31) % 128, 168 + ((i * 13) % 4) * 9, 4.5, 3, "#fff3d4", op="0.85")
                 for i in range(11))
    b += '<rect x="200" y="216" width="240" height="18" rx="9" fill="#5faa42" stroke="#2b5f1c" stroke-width="1.2"/>'
    b += "".join(el(216 + i * 38, 220, 22, 10, "#69b84c", rot=(i % 2) * 8 - 4, op="0.9") for i in range(6))
    b += '<rect x="206" y="230" width="228" height="26" rx="10" fill="url(#carn)" stroke="#1f0c04" stroke-width="1.6"/>'
    b += path("M 222 240 q 98 -12 196 0", stroke="#8a4c26", sw=3, op="0.5")
    b += path("M 196 252 q 42 22 124 22 q 82 0 124 -22 l -8 -20 q -40 20 -116 20 q -76 0 -116 -20 Z",
              fill="url(#ques)", stroke="#b8790e", sw=1.2)
    b += "".join(el(x, y, 20, 8, "#c8331f", rot=r, stroke="#7d1f11", sw=1) for x, y, r in
                 ((262, 262, -6), (378, 262, 6)))
    b += path("M 200 268 q 12 34 120 34 q 108 0 120 -34 q 4 24 -30 34 q -40 12 -90 12 q -50 0 -90 -12 q -34 -10 -30 -34 Z",
              fill="url(#pan1)", stroke="#9a681f", sw=1.6)
    # papas fritas
    for x, y, r in ((452, 300, 66), (466, 276, 78), (438, 322, 54)):
        b += path("M %.1f %.1f l 56 -12 l 4 14 l -56 12 Z" % (x, y), fill="#f0c469",
                  stroke="#b9782c", sw=1.1, extra='transform="rotate(%.0f %.1f %.1f)"' % (r, x, y))
    return d, b


def tacos():
    d, b = plato_oscuro(320, 288, 180, 114, "pta")
    d += lin("tort", [("0%", "#f7e8c4"), ("55%", "#e2c483"), ("100%", "#bd9750")], y2="100%")
    d += lin("tortb", [("0%", "#d9bf85"), ("100%", "#a9834a")], y2="100%")
    d += lin("rell", [("0%", "#b8551f"), ("100%", "#6d2a08")], y2="100%")
    for x, y, esc in ((236, 268, 0.9), (320, 252, 1.0), (404, 268, 0.9)):
        r = 46 * esc
        b += ('<g>' +
              # media tortilla del fondo
              path("M %.1f %.1f a %.1f %.1f 0 0 0 %.1f 0 Z" % (x - r, y - 12, r, r * 0.96, 2 * r),
                   fill="url(#tortb)", stroke="#8f6c34", sw=1.4) +
              # relleno
              path("M %.1f %.1f q %.1f -%.1f %.1f 0 q -%.1f %.1f -%.1f 0 Z" % (
                  x - r + 5, y - 14, r * 0.9, r * 0.62, 2 * (r - 5), r * 0.9, r * 0.22, 2 * (r - 5)),
                   fill="url(#rell)", stroke="#542006", sw=1.2) +
              "".join(el(x - r * 0.6 + j * r * 0.4, y - 22 - (j % 2) * 6, 8 * esc, 5 * esc, "#5faa42",
                         rot=18 * j - 20) for j in range(4)) +
              "".join(el(x - r * 0.5 + j * r * 0.5, y - 12, 6 * esc, 4 * esc, "#f0e6cd", op="0.9")
                      for j in range(3)) +
              el(x + r * 0.25, y - 26, 7 * esc, 5 * esc, "#c0341f", rot=14) +
              # media tortilla del frente
              path("M %.1f %.1f a %.1f %.1f 0 0 0 %.1f 0 Z" % (x - r + 4, y - 4, r - 4, (r - 4) * 0.94, 2 * (r - 4)),
                   fill="url(#tort)", stroke="#a37d3e", sw=1.5) +
              path("M %.1f %.1f a %.1f %.1f 0 0 0 %.1f 0" % (x - r + 12, y + 2, r - 12, (r - 12) * 0.9, 2 * (r - 12)),
                   stroke="#c9a05c", sw=2, op="0.55") +
              "".join(el(x - r * 0.4 + j * r * 0.4, y + r * 0.42, 5 * esc, 3.4 * esc, "#a9834a", op="0.5")
                      for j in range(3)) +
              "</g>")
    b += rodaja_limon(212, 334, 26, rot=-14)
    b += "".join(el(x, y, 12, 5, "#c0341f", rot=r, op="0.95") for x, y, r in
                 ((432, 330, 20), (394, 340, -18)))
    b += perejil(464, 306, n=6, r=11)
    return d, b


def pizza():
    d, b = tabla(320, 262, 350, 208, "tpz")
    d += rad("mas", [("0%", "#f6d99a"), ("70%", "#e3b565"), ("100%", "#bd832e")], cy="34%")
    d += rad("sals", [("0%", "#d4472a"), ("100%", "#9c2412")])
    b += el(320, 258, 148, 108, "url(#mas)", stroke="#a9772a", sw=2)
    b += el(320, 258, 128, 90, "url(#sals)")
    b += el(320, 258, 122, 84, "#f0d68e", op="0.55")
    b += "".join(el(x, y, 20, 14, "#b0203c", rot=r, stroke="#6d1023", sw=1.2) + el(x - 5, y - 4, 6, 4, "#e0607a", op="0.5")
                 for x, y, r in ((272, 232, -10), (352, 224, 14), (392, 268, 24), (296, 288, -20),
                                 (356, 292, 8), (316, 254, 30)))
    b += "".join(el(x, y, 12, 8, "#f6ecd2", rot=r, op="0.75") for x, y, r in
                 ((248, 268, 20), (330, 210, -14), (386, 232, 34), (266, 300, 6)))
    b += "".join(el(x, y, 7, 5, "#3f8a2a", rot=r) for x, y, r in
                 ((300, 222, 10), (372, 300, -24), (238, 246, 40)))
    for a in (18, 78, 138, 198, 258, 318):
        b += path("M 320 258 l %.1f %.1f" % (math.cos(math.radians(a)) * 146, math.sin(math.radians(a)) * 104),
                  stroke="#8a5c1c", sw=2, op="0.5")
    return d, b


def cerveza():
    d, b, cuerpo, borde = copa_cerveza(320, 132, 388, 80, 56, "vce")
    d += lin("cerv", [("0%", "#ffc451"), ("50%", "#e08a12"), ("100%", "#a85a05")], y2="100%")
    d += '<clipPath id="cce"><path d="%s"/></clipPath>' % cuerpo
    b += '<g clip-path="url(#cce)">'
    b += '<rect x="236" y="176" width="168" height="222" fill="url(#cerv)"/>'
    b += burbujas(320, 200, 380, 108, 30, "#fff0c4", "0.5")
    b += "</g>"
    b += borde
    b += "".join(el(254 + i * 19, 172 - (i % 3) * 8, 18, 14, "#fffaf0", stroke="#e6dcc4", sw=1)
                 for i in range(8))
    b += el(320, 178, 76, 15, "#fffdf6", op="0.9")
    b += path("M 252 200 L 264 362", stroke="#ffffff", sw=6, op="0.18")
    b += path("M 386 200 L 374 362", stroke="#ffffff", sw=3, op="0.12")
    return d, b


def vino():
    d = (lin("copa", [("0%", "#ffffff", "0.20"), ("45%", "#ffffff", "0.04"), ("100%", "#ffffff", "0.14")], x2="100%", y2="0%") +
         lin("tinto", [("0%", "#a01530"), ("55%", "#6d0a1f"), ("100%", "#3d0512")], y2="100%"))
    cuenco = "M 236 158 q 0 122 84 130 q 84 -8 84 -130 Z"
    b = sombra(320, 404, 96, 14, "0.5")
    b += path("M 312 286 L 312 384", stroke="#e8eef0", sw=7, op="0.55")
    b += path("M 260 392 q 60 -14 120 0 q -60 14 -120 0 Z", fill="#ffffff", op="0.14",
              stroke="#d3dadc", sw=1.5)
    b += path(cuenco, fill="url(#copa)", stroke="#d3dadc", sw=1.8)
    b += '<clipPath id="cvi"><path d="%s"/></clipPath>' % cuenco
    b += '<g clip-path="url(#cvi)"><path d="M 228 232 q 92 26 188 0 l 0 70 q -50 62 -94 62 q -44 0 -94 -62 Z" fill="url(#tinto)"/></g>'
    b += el(320, 234, 82, 16, "#c02744", op="0.75")
    b += path("M 252 190 q 20 74 60 92", stroke="#ffffff", sw=4, op="0.22")
    b += path("M 244 166 q 76 20 152 0", stroke="#ffffff", sw=2, op="0.28")
    return d, b


def plato_generico():
    d, b = plato_oscuro(320, 258, 158, 106, "pge")
    d += lin("cub", [("0%", "#e2e8ea"), ("100%", "#7d8487")], x2="100%")
    b += el(320, 258, 88, 56, "#191818", stroke="#3f3c3b", sw=1)
    b += el(320, 254, 46, 28, "#ff6600", op="0.10")
    b += path("M 268 258 a 52 34 0 0 1 104 0", stroke="#ff6600", sw=2, op="0.35")
    # tenedor
    b += ('<g transform="rotate(-4 150 258)">' +
          "".join('<rect x="%.1f" y="150" width="6" height="48" rx="3" fill="url(#cub)"/>' % (134 + i * 12)
                  for i in range(3)) +
          path("M 134 192 q 22 20 44 0 l 0 12 q -22 18 -44 0 Z", fill="url(#cub)") +
          '<rect x="151" y="198" width="8" height="152" rx="4" fill="url(#cub)"/>' +
          "</g>")
    # cuchillo
    b += ('<g transform="rotate(4 492 258)">' +
          path("M 482 148 q 26 16 18 78 l -18 0 Z", fill="url(#cub)", stroke="#5e6568", sw=1) +
          '<rect x="482" y="222" width="9" height="128" rx="4" fill="url(#cub)"/>' +
          "</g>")
    return d, b


def hero_lomo():
    """Portada: el corte de la parrilla, con más aire alrededor."""
    d, b = lomo_res()
    b += "".join(el(x, y, 3, 2.4, "#ff9a3d", op="0.35") for x, y in
                 ((150, 150), (508, 168), (128, 352), (520, 344), (196, 118), (462, 396)))
    return d, b


# ---------------------------------------------------------------- catálogo

CARTA = [
    ("tabla-kairos",        "Tabla Kairos: quesos, embutidos y pan",       NARANJA, tabla_kairos),
    ("ceviche",             "Ceviche de la casa en copa",                  AZUL,    ceviche),
    ("alitas-ahumadas",     "Alitas ahumadas glaseadas",                   NARANJA, alitas),
    ("lomo-de-res",         "Lomo de res a la parrilla",                   NARANJA, lomo_res),
    ("costilla-braseada",   "Costilla braseada sobre puré de yuca",        NARANJA, costilla),
    ("pollo-a-la-brasa",    "Pollo a la brasa con tortillas",              AMBAR,   pollo_brasa),
    ("camarones-al-ajillo", "Camarones al ajillo en cazuela",              NARANJA, camarones_ajillo),
    ("filete-de-pescado",   "Filete de pescado con arroz y vegetales",     AZUL,    filete_pescado),
    ("pasta-al-pesto",      "Pasta al pesto con tomate confitado",         VERDE,   pasta_pesto),
    ("fettuccine-alfredo",  "Fettuccine Alfredo",                          AMBAR,   fettuccine),
    ("volcan-de-chocolate", "Volcán de chocolate con helado",              ROSA,    volcan_chocolate),
    ("tres-leches",         "Tres leches con frutos rojos",                ROSA,    tres_leches),
    ("limonada",            "Limonada con hierbabuena",                    VERDE,   limonada),
    ("cafe",                "Café en prensa francesa",                     NARANJA, cafe),
    ("gaseosa-agua",        "Botella de 500 ml y vaso con hielo",          AZUL,    gaseosa_agua),
    ("mojito",              "Mojito de la casa",                           VERDE,   mojito),
    ("old-fashioned",       "Old Fashioned",                               NARANJA, old_fashioned),
    ("michelada",           "Michelada con escarchado de tajín",           ROSA,    michelada),
    # comodines para platos que se agreguen desde el panel
    ("ensalada",            "Ensalada fresca",                             VERDE,   ensalada),
    ("sopa",                "Sopa caliente",                               AMBAR,   sopa),
    ("hamburguesa",         "Hamburguesa con papas",                       NARANJA, hamburguesa),
    ("tacos",               "Tacos con limón y cilantro",                  AMBAR,   tacos),
    ("pizza",               "Pizza en tabla",                              NARANJA, pizza),
    ("cerveza",             "Cerveza de barril",                           AMBAR,   cerveza),
    ("vino",                "Copa de vino tinto",                          ROSA,    vino),
    ("plato-generico",      "Plato de la carta de Kairos",                 NARANJA, plato_generico),
]

PORTADAS = [
    ("hero-plato.svg",  "Corte a la parrilla de la carta de Kairos", NARANJA, hero_lomo,      1200, 675, 2.02),
    ("hero-coctel.svg", "Coctelería de la barra de Kairos",          ROSA,    old_fashioned,   720, 720, 1.30),
]


def main():
    os.makedirs(PLATOS, exist_ok=True)
    for slug, alt, acento, dibujo in CARTA:
        d, b = dibujo()
        escribir(os.path.join(PLATOS, slug + ".svg"), alt, acento, d, b)
        print("assets/img/platos/%s.svg" % slug)
    for nombre, alt, acento, dibujo, w, h, s in PORTADAS:
        d, b = dibujo()
        escribir(os.path.join(IMG, nombre), alt, acento, d, b, w=w, h=h, s=s)
        print("assets/img/%s" % nombre)
    print("\n%d ilustraciones generadas." % (len(CARTA) + len(PORTADAS)))


if __name__ == "__main__":
    main()
