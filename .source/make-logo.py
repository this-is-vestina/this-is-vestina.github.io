"""把 Space Grotesk 的文字轮廓转成 SVG 矢量路径，生成站点头部 logo。

为什么不用 <text>：SVG 里的 <text> 依赖客户端字体，字体没加载/被回退时
字宽字形都会变。转成 path 后是纯几何，任何环境渲染结果完全一致。

用法：
    python make-logo.py            # 需要同目录下有 SpaceGrotesk.ttf
输出：
    ../assets/img/rhine-logo.svg

注意输出到 assets/ 而不是 static/ —— blowfish 的 header 用
`resources.Get .Site.Params.Logo` 读 logo，而 resources.Get 只查 assets/。
放 static/ 的话文件会照常发布，但 header 取不到，会静默不显示 logo。
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

TEXT = "VESTINA"
WEIGHT = 700
TRACKING_EM = 0.12      # 字距（相对 em）
CAP_UNITS = 18.0        # 目标大写字母高度（SVG 用户单位）
GAP = 10.0              # 环与文字之间的间距

HERE = Path(__file__).parent
OUT = HERE.parent / "assets" / "img" / "rhine-logo.svg"


def round2(v):
    """坐标保留两位小数，减小文件体积。"""
    return f"{v:.2f}".rstrip("0").rstrip(".")


def main():
    font = TTFont(HERE / "SpaceGrotesk.ttf")
    font = instantiateVariableFont(font, {"wght": WEIGHT}, inplace=False)

    upm = font["head"].unitsPerEm
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]

    # 用 "H" 的大写字高换算 scale，这样 CAP_UNITS 是精确的视觉高度
    cap_height = font["OS/2"].sCapHeight
    scale = CAP_UNITS / cap_height
    tracking = TRACKING_EM * upm * scale

    # --- 逐字生成路径，累积 x 偏移 ---
    paths = []
    x = 0.0
    for ch in TEXT:
        name = cmap[ord(ch)]
        glyph = glyph_set[name]

        pen = SVGPathPen(glyph_set, ntos=round2)
        # 字体的 y 轴朝上，SVG 的 y 轴朝下 —— 这里翻转。
        # 注意：只做缩放/翻转，不在这里加 x 偏移 —— 位移统一交给下面
        # SVG 的 transform，否则会和字形自身的 left side bearing 叠加成双重位移。
        glyph.draw(TransformPen(pen, Transform(scale, 0, 0, -scale, 0, 0)))
        d = pen.getCommands()
        if d:
            paths.append((x, d))

        x += hmtx[name][0] * scale + tracking

    text_width = x - tracking  # 去掉最后一个字后面的字距

    # --- 组装整张 SVG ---
    # 环的外径略大于大写字高，比例接近参考图
    ring_r = 10.0
    ring_stroke = 2.4
    ring_outer = ring_r * 2 + ring_stroke
    ring_cx = ring_stroke / 2 + ring_r
    height = CAP_UNITS + 10                 # 上下留白
    width = ring_cx + ring_r + ring_stroke / 2 + GAP + text_width

    baseline = height / 2 + CAP_UNITS / 2   # 让文字视觉居中
    text_x0 = ring_cx + ring_r + ring_stroke / 2 + GAP

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {round2(width)} {round2(height)}" '
        f'fill="none" role="img" aria-label="VESTINA">',
        "  <!-- Möbius ring -->",
        f'  <g transform="translate({round2(ring_cx)}, {round2(height / 2)})" '
        f'stroke="currentColor" stroke-width="{round2(ring_stroke)}" fill="none">',
        f'    <path d="M 0 {round2(-ring_r)} A {round2(ring_r)} {round2(ring_r)} 0 0 1 '
        f'0 {round2(ring_r)}" stroke-linecap="round"/>',
        f'    <path d="M 0 {round2(-ring_r)} A {round2(ring_r)} {round2(ring_r)} 0 0 0 '
        f'0 {round2(ring_r)}" stroke-linecap="round" stroke-dasharray="4 3"/>',
        "  </g>",
        "  <!-- VESTINA (outlined to paths) -->",
        '  <g fill="currentColor">',
    ]

    for gx, d in paths:
        parts.append(f'    <path transform="translate({round2(text_x0 + gx)}, {round2(baseline)})" d="{d}"/>')

    parts += ["  </g>", "</svg>", ""]

    OUT.write_text("\n".join(parts), encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size} bytes)")
    print(f"  viewBox 0 0 {round2(width)} {round2(height)}  |  text width {round2(text_width)}")


if __name__ == "__main__":
    main()
