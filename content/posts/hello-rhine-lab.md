+++
date = 2026-09-20
draft = false
title = '我的个人网站上线了'
summary = '经过数周的筹备，这个基于 Hugo 和 Blowfish 主题的个人站点终于上线了。这里记录下从配色到字体、从布局到动效的设计思考。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['Hugo 建站实战']
series_order = 1
categories = ['建站']
tags = ['meta', 'design']
+++

## 这是什么

这是我的个人网站。它不是博客模板的简单复制 —— 整个站点的视觉系统都来自明日方舟「莱茵生命」部门的 UI 风格：米白底色、橙色（`#FF6B1A`）主色、几何未来感字体。

## 设计原则

- **磁带盒未来主义**：圆角 + 等宽字体 + 数据读数
- **不喧宾夺主**：内容永远比装饰重要
- **动效克制**：粒子、glitch、光标荧光团 —— 每个动效都有意义

## 技术栈

Hugo + Blowfish + 自定义 CSS token + tsparticles。光标跟随的荧光团和粒子全部跑在前端，没有服务器依赖。