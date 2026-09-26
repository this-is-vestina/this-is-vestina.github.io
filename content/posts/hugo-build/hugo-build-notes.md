+++
date = 2026-09-18
draft = false
title = 'Hugo 站点从零到部署 —— GitHub Pages 实战'
summary = '本地预览 → git 初始化 → push → GitHub Actions 自动构建。整个流程不超过 30 分钟，本文记录每一步的命令和注意事项。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['Hugo 建站实战']
series_order = 2
categories = ['建站']
tags = ['hugo', 'github-pages']
+++

## 为什么是 Hugo

- 静态站点，部署到 GitHub Pages 完全免费
- 没有运行时依赖，构建一次到处运行
- 模板系统灵活，可以完全自定义

## 关键步骤

1. 安装 Hugo Extended
2. `hugo new site .` 初始化
3. 添加 Blowfish 主题（submodule）
4. 自定义配色 token + 切角面板
5. 写内容
6. push → GitHub Actions 自动部署

## 踩坑

最大的坑是子模块的版本控制 —— 升级前先看 changelog，否则 API 变更会让整个站点渲染失败。