+++
title = "项目 B：极简静态博客生成器"
date = 2026-06-10
draft = false
summary = "一个 200 行的 Python 脚本，把 Markdown 转成单一 HTML 文件"
tags = ["python", "static-site"]
categories = ["engineering"]
+++

<span class="rhine-dot rhine-dot-warn"></span><span class="rhine-data">WIP · 2026.06.10</span>

## 简介

比 Hugo 还简单的静态博客——单文件输出，所有资源内联，无外部依赖。

## 设计取舍

| 取 | 舍 |
|---|---|
| 单 HTML 文件，方便分享 | 不支持复杂主题 |
| 零依赖 | 没有增量构建 |
| Markdown 简洁 | 不支持图片处理 |

适合个人笔记、不需要复杂版式的场景。