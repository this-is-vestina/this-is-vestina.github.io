+++
title = "切角面板的实现"
date = 2026-09-24
draft = false
summary = "CSS clip-path: polygon 的几种用法与浏览器兼容性"
tags = ["css", "design"]
categories = ["engineering"]
authors = ["Dr. Operator"]
+++

<span class="rhine-data">ENGINEERING · CSS · 2026.09.24</span>

莱茵生命风格最显眼的视觉签名之一就是**切角面板**——面板的左上角和右下角被斜切掉一个小三角形。

## 实现：clip-path

```css
.clip-corner {
  clip-path: polygon(
    0 8px,        /* 左上：起点往下 8px */
    8px 0,        /* 左上：往右 8px */
    100% 0,       /* 右上：原样 */
    100% calc(100% - 8px),  /* 右下：往上 8px */
    calc(100% - 8px) 100%,  /* 右下：往左 8px */
    0 100%        /* 左下：原样 */
  );
}
```

效果：

![cut-corner](https://placeholder.pics/svg/300x100/DEDEDE/555555/?text=cut-corner-demo)

## 浏览器支持

`clip-path` 在所有现代浏览器中都支持（Chrome 88+、Firefox 90+、Safari 14+）。对老旧浏览器无影响——只是没有切角而已，回退到方形面板。

## 进一步定制

切角尺寸可以用 CSS 变量控制：

```css
:root { --corner: 12px; }
.panel { clip-path: polygon(
  0 var(--corner),
  var(--corner) 0,
  100% 0,
  100% calc(100% - var(--corner)),
  calc(100% - var(--corner)) 100%,
  0 100%
); }
```

也可以做四个角都切、四角切圆、随机切——根据设计需求灵活调整。