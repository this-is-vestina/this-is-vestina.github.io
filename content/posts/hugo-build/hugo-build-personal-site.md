+++
date = 2026-09-26
draft = false
title = '如何基于 Hugo 搭建你的个人网站：从 0 到部署的全过程'
summary = 'Hugo 装环境、初始化、接主题、改配置、首页定制、内容组织、覆盖 layout、GitHub Pages 自动部署 — 把建站全过程串成一份完整教程。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['Hugo 建站实战']
series_order = 1
categories = ['建站']
tags = ['hugo', 'blowfish', 'tutorial', 'github-pages']
+++

详细记录了建站过程，每一步给能跑的命令、能直接抄的配置、以及为什么这么选。

## 1. 环境准备

### 1.1 Hugo 版本选型

Hugo Extended 版（带 SCSS/SASS 支持）是绝大多数主题的硬性要求，Blowfish 也不例外。

| 平台 | 安装 |
|---|---|
| macOS | `brew install hugo` |
| Linux | `sudo apt install hugo` 或 snap / 下载 release 二进制 |
| Windows | scoop / choco / 手动下二进制 |
| 全平台 | 官方 release：<https://github.com/gohugoio/hugo/releases> |

**版本范围**：Blowfish 主题根目录的 `themes/blowfish/config.toml` 里有 `[module.hugoVersion]` 字段规定了兼容范围。**别用太新的版本** —— Hugo 主版本号变了经常有 breaking changes。Stable 就行。

> **本站的坑**：本机 v0.165.0 在 Windows 上 `hugo config` 都 segfault（`DecodeSegments` 段错误）。换到 v0.164.0 一切正常。CI 里**继续锁 0.165.0**（v0.164.0 在 Linux CI 上偶尔有兼容 warning，反而不报错）。结论：**本机和 CI 可以用不同版本**，只要都在主题兼容范围内。

### 1.2 安装方式选择

- **下载 release 二进制**（本站用法）：解压到 `/usr/local/bin/`（mac/linux）或 PATH 里的目录
- **包管理器**：自动跟系统升级，本机开发够用
- **Hugo binary in `bin/`**（本站做法）：建站项目旁放一个 `bin/hugo.exe`，跟项目一起 git 管理，跨机器复现一致

## 2. 初始化项目

```bash
# 新建站点
hugo new site my-site
cd my-site

# 三种方式装主题（选一种）

# A. Hugo module（推荐，无 git submodule 嵌套）
hugo mod init github.com/your-name/my-site
# 然后在 config/_default/module.toml 加：
# [[imports]]
# path = "github.com/nunocoracao/blowfish/v3"

# B. Git submodule（本站用法，能直接改主题源码看 diff）
git init
git submodule add -b main https://github.com/nunocoracao/blowfish.git themes/blowfish

# C. 手动下 release zip，解压到 themes/blowfish/

# 在 config/_default/hugo.toml 设：
echo 'theme = "blowfish"' >> config/_default/hugo.toml
```

### 2.1 三种安装方式对比

| 方式 | 优点 | 缺点 |
|---|---|---|
| Hugo module | 无 submodule，依赖清晰 | 改主题需要 `npm run build`，稍繁琐 |
| Git submodule | 直接编辑主题源码，IDE 跳转 | submodule 嵌套麻烦，需要 `submodules: recursive` 拉 |
| 手动下载 | 最简单 | 升级要手动覆盖整个 themes/ 目录 |

**推荐**：日常用 Hugo module（生产级），想折腾主题用 submodule（开发友好）。

### 2.2 初始化配置

把主题的配置样例拷过来：

```bash
# 从 themes/blowfish 的 exampleSite 复制 config 文件
cp -r themes/blowfish/exampleSite/config/_default/* config/_default/
```

或者直接去主题 release 页下 `config-default.zip`。

## 3. 核心配置

`config/_default/` 下分多个文件，职责分明：

| 文件 | 内容 |
|---|---|
| `hugo.toml` | 站点根配置（baseURL / title / theme / 多语言 / 构建选项） |
| `params.toml` | 主题行为（colorScheme / header / homepage / 文章显示） |
| `menus.<lang>.toml` | 主导航 + footer + 子导航 |
| `languages.<lang>.toml` | 每种语言站点标题 / 作者信息 |
| `markup.toml` | Goldmark 配置（HTML 是否允许） |
| `module.toml` | Hugo module imports（如果用 module 安装） |

### 3.1 `hugo.toml` 关键字段

```toml
theme = "blowfish"
baseURL = "https://your-name.github.io/"   # ← 上线前必须改
defaultContentLanguage = "zh-cn"
title = "Your Site Name"

# 构建选项
enableRobotsTXT = true
summaryLength = 0            # 0 = 全文当摘要，自己控制
buildDrafts = false
enableEmoji = true
```

> **`baseURL` 是最容易忘的坑**：本地开发可以写 `http://localhost:1313/`，但上线前必须改回正式域名。否则所有站内链接、RSS、social meta 全部指错地方。

### 3.2 `params.toml` 关键配置

```toml
colorScheme = "blowfish"        # 用主题自带 / 自定义
defaultAppearance = "light"     # "light" / "dark" / "auto"
autoSwitchAppearance = true     # 跟随系统

[header]
  layout = "fixed"              # basic / fixed / fixed-fill / fixed-gradient / fixed-fill-blur / floating

[homepage]
  layout = "custom"             # page / profile / hero / card / background / landing / custom
  layoutSwitcher = false

[article]
  showReadingTime = true
  showTableOfContents = true
  showShareButtons = true

[list]
  showSummary = true
  groupByYear = true
  cardView = false

[footer]
  showCopyright = true
```

**主题推荐配置**：固定 header + 自定义首页 + 文章显示 TOC + 列表按年分组。

## 4. 主题定制

### 4.1 自定义配色方案

Blowfish 主题通过 `--color-neutral-*` / `--color-primary-*` / `--color-secondary-*` RGB 三元组控制颜色。把同名 CSS 文件放到 `assets/css/schemes/<name>.css` 即可启用。

```bash
# 复制主题自带方案作为模板
cp themes/blowfish/assets/css/schemes/blowfish.css assets/css/schemes/rhine.css
# 改名为 rhine 后，在 params.toml 里：
# colorScheme = "rhine"
```

**调色板结构**（每个调色板变量都是 RGB 三元组，**不带 rgb() 包裹**）：

```css
:root {
  --color-neutral-50:   245, 242, 236;  /* 最浅，米白 */
  --color-neutral-100:  230, 226, 218;
  --color-neutral-200:  210, 204, 195;
  --color-neutral-300:  180, 170, 158;
  /* ... */
  --color-neutral-900:  30,  20,  10;   /* 最深 */

  --color-primary-500:   255, 107, 26;   /* 主色（莱茵橙）*/
  --color-secondary-500: 60, 155, 210;   /* 次色（数据青）*/
}
```

> **Tailwind 编译层**：`tailwind.config.js` 里的 `darkMode: "class"` 锁死了深色模式用 `.dark` class 切换。所有"深色下用什么颜色"都得在 `html.dark { ... }` 块里覆写，不是 `[data-theme="dark"]`。

### 4.2 自定义 CSS

放到 `assets/css/custom.css`，Hugo 会自动注入到所有页面。**无需**在 layout 里手动引。

```bash
# 创建空文件
touch assets/css/custom.css
```

**常用模式**：

```css
/* 1. 覆写主题的某个具体类 */
.dark\:prose-invert {
  color: var(--color-neutral-200) !important;
}

/* 2. 用 !important 覆盖 Tailwind 的 utility（避免 specificity 战争）*/
html.dark .my-card {
  background: var(--rhine-bg-deep) !important;
}

/* 3. 用 CSS 变量集中颜色，方便后期调 */
:root {
  --rhine-bg:         rgb(245, 242, 236);
  --rhine-bg-elevated: rgb(255, 252, 245);
  --rhine-ink:        rgb(15, 30, 46);
}
```

### 4.3 自定义 partial

主题的 partial 在 `themes/blowfish/layouts/partials/`，**网站级 override** 放 `layouts/partials/` 同名文件即可。

```bash
# 例：自定义首页（覆盖主题所有 homepage layout）
vim layouts/partials/home/custom.html
```

这种 override 是**整个替换**，不 merge。要想保留主题结构，参考 [Blowfish 自定义教程](https://blowfish.page/docs/partials/#extending-theme-templates)。

## 5. 内容组织

### 5.1 Page Bundle vs flat

| 结构 | URL | 适用 |
|---|---|---|
| Flat | `/posts/foo.md` → `/posts/foo/` | 简单博客，文章少 |
| Page Bundle | `/posts/foo/index.md` → `/posts/foo/` | 单篇文章有图片、附件 |

**本站用法**（混合）：

```
content/posts/
├── _index.md                   # /posts/ 总览
├── csapp/
│   ├── _index.md               # /posts/csapp/ 专栏首页
│   └── csapp-01.md             # /posts/csapp/csapp-01/
└── hugo-build/
    ├── _index.md
    └── hugo-build-notes.md
```

子目录里所有 `.md` 平铺，目录本身控制 section URL。

### 5.2 frontmatter（关键字段速查）

详见同系列《[Hugo 内容格式完全指南](/posts/hugo-build/hugo-content-format/)》。最常用的：

```toml
+++
date = 2026-09-26
draft = false
title = '文章标题'
summary = '一句话摘要'
authors = ['你的名字']
showDate = true
showReadingTime = true
showSummary = true
series = ['系列名']
series_order = 1
categories = ['分类']
tags = ['标签1', '标签2']
+++
```

### 5.3 _index.md 与 weight

每个 section 文件夹放一个 `_index.md` 控制该 section 列表页。**最重要的字段是 `weight`** —— 数字小 = 靠前。

```toml
+++
title = "Hugo 建站实战"
weight = 20    # 在 /posts/ 上排第 2 位
summary = "本站从 Hugo 初始化到 GitHub Pages 自动部署的全过程记录。"
+++
```

> **`weight` 跨 section 排序**：本站 3 个专栏权重 10/20/90，/posts/ 上从左到右：CSAPP → Hugo 建站 → 随笔。**小权重 = 靠左/靠前**，全站唯一权重排序轴。

## 6. 首页定制（最见功力的部分）

Blowfish 主题提供了 7 种首页 layout：`page` / `profile` / `hero` / `card` / `background` / `landing` / **`custom`**。

要自定义首页选 `custom`，然后写 `layouts/partials/home/custom.html`：

```bash
# 启用 custom
# config/_default/params.toml 里：
# [homepage]
#   layout = "custom"

vim layouts/partials/home/custom.html
```

**本站首页结构**（自定义全屏视频背景 + 粒子层 + 滚动引言）：

```go-html-template
<section class="rhine-hero">
  <video class="rhine-hero-video" autoplay muted loop playsinline
         poster="/img/hero-poster.jpg">
    <source src="/img/hero-bg.mp4" type="video/mp4">
  </video>

  <div id="tsparticles"></div>   {{/* 粒子层 */}}

  <div class="rhine-hero-content">
    <h1 class="rhine-hero-title">-vestina-</h1>
    <p class="rhine-hero-quote" id="rhine-hero-quote"
       data-quotes='{{ $quotes | jsonify }}'>
      {{ index $quotes 0 }}
    </p>
  </div>
</section>
```

**思路**：

1. `{{ $quotes | jsonify }}` —— Hugo 把 Go slice 序列化成 JSON 数组，写到 HTML 的 `data-*` 属性里
2. 前端 JS 读这个属性，`setInterval` 循环切换引言文字
3. 视频 / 粒子 / 引言各自独立，只在 hero 区显示，不影响下方文章列表

## 7. 覆盖 section layout

默认 `_default/list.html` 对 `/posts/` 列的是子目录卡片。要改成扁平列所有文章 + 分页：

```bash
# 创建 override
mkdir -p layouts/posts
vim layouts/posts/list.html
```

只覆盖 `layouts/posts/list.html`，**不**碰 `_default/list.html` —— 这样其他 section（如 `/posts/csapp/`）继续用默认行为。

核心改动一行：

```go
{{/* 默认模板：列子目录 section 页 */}}
{{ range .Pages }}

{{/* 改成：扁平拉所有 RegularPages */}}
{{ $posts := where .Site.RegularPages "Section" "posts" }}
{{ range (.Paginate $posts).Pages }}
```

完整版见 git 提交 `feat(layouts): /posts/ 改成扁平列出所有文章 + 分页`。

## 8. 部署上线（GitHub Pages）

### 8.1 仓库准备

1. GitHub 建仓 `your-name.github.io`
2. 本地加 remote：`git remote add origin git@github.com:your-name/your-name.github.io.git`
3. 主题用 submodule 的话，submodule 的 remote URL **必须是公开仓库**（Blowfish 是公开的，没问题）

### 8.2 GitHub Actions workflow

`.github/workflows/hugo.yml`：

```yaml
name: Deploy Hugo site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive   # ← 必须：拉主题 submodule
          fetch-depth: 0

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: '0.165.0'   # ← 锁版本，跟本机不同也行
          extended: true

      - name: Build with Hugo
        run: hugo --minify

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 8.3 GitHub 端设置

在仓库 Settings → Pages → Source 选 **"GitHub Actions"**（**不是** "Deploy from a branch"）。

### 8.4 自定义域名

在仓根放 `CNAME` 文件（一行域名），push 即可。DNS 配 CNAME 指向 `your-name.github.io.`，等证书自动签发。

> **HTTPS 证书**：GitHub Actions 模式下 GitHub 自动用 Let's Encrypt 签发，**不用**手动操作。等 5-30 分钟生效。

## 9. 本系列踩过的所有坑（速查表）

| 症状 | 原因 | 修法 |
|---|---|---|
| `hugo` segfault (Windows) | 特定版本有 bug | 降级到 v0.164.0 或换 Linux CI |
| 切深色后字"消失" | `--tw-prose-invert-*` 没覆写 | `html.dark .prose { --tw-prose-invert-body: ... }` |
| 切深色后 footer 变米白 | 全局 `footer` 规则太宽 | scope 到 `#site-footer` |
| 切深色后 series summary 偏色 | 默认橙色 token 跟深色不和谐 | 自定义 `details > summary` 深色 bg |
| 代码块里写 `{{</* figure */>}}` 被解析 | Hugo 短代码解析早于 markdown | 用 `{{</* figure */>}}` 转义 |
| 改了 CSS 没生效 | Hugo 把 CSS 缓存到 `resources/_gen/` | `hugo --gc` 重建 |
| baseURL 配错 | 写成本地 `localhost` 没改 | 上线前 grep 一遍 |
| 内链 404 | 改 / 删了文章，没加 alias | `_index.md` frontmatter 加 `aliases: ["/old/path/"]` |

---

## 一句话总结

**Hugo + Blowfish + GitHub Pages** 三件套，个人站点够用。环境装对（Hugo Extended，注意版本），主题 submodule 接上，配置改 baseURL + colorScheme，内容 Page Bundle 组织，自定义从 CSS 入手（投入最小效果最大），部署走 GitHub Actions。流程跑通，专心写文章。