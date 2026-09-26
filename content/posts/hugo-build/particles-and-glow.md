+++
date = 2026-09-15
draft = false
title = '粒子与荧光：首页的微观动效设计'
summary = 'tsparticles 跑粒子，光标跟随用 requestAnimationFrame 做 tweening。本文拆解首页动效系统的实现细节 —— 60fps 不掉帧的关键。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['Hugo 建站实战']
series_order = 3
categories = ['前端']
tags = ['frontend', 'animation']
+++

## 设计目标

首页需要看起来"活"起来，但不能让动效干扰内容阅读。约束：

- 粒子只在 hero 区域显示
- 鼠标交互要有反馈，但不能分散注意力
- 移动端必须降级或关闭

## 实现要点

- **粒子层用 absolute + pointer-events: none**，让 hover/click 透传到下层
- **光标圆环和荧光团分开**，圆环跟手，荧光团滞后（不同 tween 系数）
- **rAF 而非 setInterval**：60fps 时每帧间隔约 16ms，rAF 会和浏览器刷新同步

## 性能

粒子数量 50 个，链接距离 130px。桌面端 GPU 占用 < 5%。