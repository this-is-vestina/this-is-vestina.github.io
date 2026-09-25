+++
title = "项目 A：实时数据可视化"
date = 2026-08-15
draft = false
summary = "基于 WebSocket 的多通道数据仪表盘，支持自定义指标与告警阈值"
tags = ["web", "realtime", "data-viz"]
categories = ["engineering"]
+++

<span class="rhine-dot rhine-dot-live"></span><span class="rhine-data">LIVE · 2026.08.15</span>

## 简介

一个支持多通道、实时刷新、可定制告警阈值的数据可视化仪表盘。前端用 Vue 3 + D3.js，后端用 Go + WebSocket。

## 技术亮点

- 自适应采样率（高频时降采样，保留视觉特征）
- 客户端可定义表达式（类似 Grafana），实时计算衍生指标
- 异常检测算法（3-sigma + EWMA）

## 截图

![dashboard](https://placeholder.pics/svg/600x300/DEDEDE/555555/?text=dashboard-screenshot)

## 代码

私有项目，未开源。