+++
title = "Hello, Rhine Lab"
date = 2026-09-25
draft = false
summary = "开篇：为什么选择 Hugo、为什么是莱茵生命"
tags = ["meta", "hugo"]
categories = ["meta"]
authors = ["Dr. Operator"]
showSummary = true
+++

<span class="rhine-dot rhine-dot-live"></span><span class="rhine-data">FIRST ENTRY · 2026.09.25</span>

这是站点的第一篇文章。

## 为什么是 Hugo

[Hugo](https://gohugo.io/) 是一个用 Go 编写的静态站点生成器。比起 Next.js / Astro / Jekyll，它的特点是：

- **极快的构建速度** — 大型站点也能秒级构建
- **单一二进制** — 没有 Node.js / Ruby / Python 依赖
- **内容与模板分离** — Markdown 写正文，Go template 写布局

## 为什么是莱茵生命

明日方舟里的莱茵生命是一个科研机构。它的 UI 充满科技感：冷蓝主色 + 深色面板 + 切角 + 等宽字体 + 数据读数 — 看起来像一个真实的实验室仪表盘。

把这种风格搬到个人站上，比常见的"博客模板"更能体现个性。

## 技术栈

| 模块 | 选型 |
|---|---|
| 静态生成 | Hugo Extended v0.165.0 |
| 主题 | Blowfish |
| 样式 | Tailwind + 自定义 CSS |
| 字体 | Inter + JetBrains Mono + Noto Sans SC |
| 部署 | GitHub Pages |

下一篇会写构建过程中遇到的细节。