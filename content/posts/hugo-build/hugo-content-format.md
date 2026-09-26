+++
date = 2026-09-26
draft = false
title = 'Hugo 内容格式完全指南：frontmatter、_index 与 Markdown 扩展'
summary = '一篇讲清楚 Hugo 文章 frontmatter 的每个字段、_index.md 怎么用、blowfish 支持哪些 Markdown 扩展。给下一任站长省下查文档的时间。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['Hugo 建站实战']
series_order = 4
categories = ['建站']
tags = ['hugo', 'markdown', 'tutorial']
+++

写 Hugo 文章时，每个 `.md` 文件顶部那几行 `+++` 包裹的 TOML 块是什么？文件夹下的 `_index.md` 又是干嘛的？正文里能用哪些 Markdown 扩展？—— 这篇把这些问题一次讲清。

## 1. 文章 frontmatter 详解

每个 `.md` 文件顶部用 `+++` 包起来的 TOML 块，叫 **frontmatter**（前置元数据）。下面是本站一篇 CSAPP 笔记的完整 frontmatter：

```toml
+++
date = 2026-09-10
draft = false
title = 'CSAPP 笔记 01：信息的表示与处理'
summary = '为什么 0.1 + 0.2 不等于 0.3？从二进制、补码、IEEE 754 浮点数的位级表示讲起，理解计算机处理数字时的取舍。'
authors = ['Vue Holding']
showDate = true
showReadingTime = true
showSummary = true
series = ['深入理解计算机系统（CSAPP）']
series_order = 1
categories = ['课程笔记']
tags = ['csapp', '系统', '二进制']
+++
```

### 1.1 字段对照表

| 字段 | 含义 | 在哪里显示 |
|---|---|---|
| `date` | 发布时间 | 文章头、卡片、prev/next 排序 |
| `draft` | 草稿状态 | dev server `-D` 才显示，prod build 跳过 |
| `title` | 文章标题 | H1、卡片标题、prev/next 标签、RSS |
| `summary` | 摘要 | 首页卡片副文本、social meta 描述 |
| `authors` | 作者列表 | 文章 meta 区 |
| `showDate` | 是否显示日期 | 文章头卡片 |
| `showReadingTime` | 是否显示"X 分钟" | 同上 |
| `showSummary` | 卡片显示摘要 | 卡片副文本 |
| `series` | 系列名 | prev/next 导航、`<details>` summary 折叠列表、series 列表页 |
| `series_order` | 系列内排序 | series 列表页里的顺序 |
| `categories` | 分类 | blowfish 自带 taxonomy，`/categories/xxx/` |
| `tags` | 标签 | blowfish 自带 taxonomy，`/tags/xxx/` |

### 1.2 必填项 vs 可选项

**必填**（不填会 fallback 到奇怪的值）：

- `title` — 不填就用文件名（"csapp-01-data-representation"）
- `date` — 不填就用文件系统时间
- `draft` — 不显式设 `false`，上线后会出现诡异现象
- `summary` — 卡片副文本是空白的，很丑

**可填可不填，但强烈建议**：

- `series` + `series_order` —— 想要文章末尾的 `<details>` summary 折叠列表能正确出现并排序
- `categories` + `tags` —— 不填就走 blowfish 默认（很丑，没颜色边框）

**高级可选**（按需）：

- `showTableOfContents` —— 右侧 TOC（默认 false，长文建议开）
- `disableShare` —— 关掉分享按钮
- `canonical` —— 自定义 canonical URL（防 SEO 重复）
- `meta_image` —— social 分享封面图
- `description` —— 比 `summary` 更长的 SEO 描述
- `slug` —— 自定义 URL 段（默认用文件名）
- `weight` —— 全局排序权重

## 2. `_index.md` 详解

每个**文件夹**可以放一个 `_index.md`，控制这个文件夹的"列表页"（也叫 **section page**）。

例：`content/posts/csapp/_index.md`：

```toml
+++
title = "深入理解计算机系统（CSAPP）"
date = 2026-09-10
draft = false
weight = 10
summary = "CSAPP 是一本把程序从源码到机器码、从内存到处理器讲透的经典教材。"
+++
```

### 2.1 `weight` 字段

**最重要的字段**。控制：

- section 列表页上的卡片顺序（`/posts/` 上的3 个 series 卡片）
- 站点主导航菜单项的顺序（`[[menu.main]]` 块里也用）

**数字越小越靠前**。本站的3 个 series：

```toml
# content/posts/csapp/_index.md
weight = 10        # ← 最左

# content/posts/hugo-build/_index.md
weight = 20

# content/posts/_misc/_index.md
weight = 90        # ← 最右
```

所以 `/posts/` 上从左到右：CSAPP → Hugo 建站 → 随笔。

### 2.2 section 页正文

`_index.md` 在 `+++` 块下方还可以写 Markdown 正文 —— 这些正文会渲染在 section 列表卡片**下方**。

例：`/posts/` 的简介区来自 `content/posts/_index.md` 的正文：

```toml
+++
title = "Posts"
date = 2026-09-25
draft = false
summary = "研究笔记、工程实践、随笔"
+++

在这里写博客列表页的简介。
```

### 2.3 layout 字段（blowfish 扩展）

```toml
layout = "list"     # 默认（垂直列表）
layout = "grid"     # 网格（卡片墙）
layout = "profile"  # 左侧 profile + 右侧列表
```

## 3. frontmatter 的三种格式

Hugo 支持三种写法，本站用的是 **TOML**（最简洁）：

```toml
+++                # TOML（本站）
key = value
+++

---                # YAML（也常见）
key: value
---

{                  # JSON（很少用）
  "key": "value"
}
```

**TOML vs YAML 选哪个？**

- TOML：标量强类型，复杂嵌套会丑。简单字段最快
- YAML：缩进敏感，多行字符串漂亮（`|` 块、`>` 折行）

本站历史是 TOML，全文一致就好——**别混用**。

## 4. Markdown 扩展（blowfish + Hugo 内置）

frontmatter 下面的正文用标准 Markdown，**外加** blowfish 提供的一组 shortcode：

### 4.1 内置 Markdown（必会）

| 语法 | 用途 |
|---|---|
| `# H1` 到 `###### H6` | 标题（Hugo 自动生成 anchor） |
| `**bold**` / `*italic*` | 加粗 / 斜体 |
| `[text](url)` | 链接 |
| `![alt](/img/x.jpg)` | 图片 |
| ` ```code``` ` | 代码块（带语言标识） |
| `> quote` | 引用（blowfish 自带美化） |
| `- item` / `1. item` | 列表 |
| `\| col \| col \|` + `\|---\|` | 表格 |
| `---` | 水平线 |

### 4.2 blowfish 提供的 shortcode

短代码用 `` `{{</* name args */>}}...{{</* /name */>}}` `` 包裹（这里用 `/* */` 注释符转义，否则 Hugo 会真去解析它）。常用：

```markdown
{{</* figure src="/img/foo.jpg" caption="配图说明" */>}}
{{</* highlight python */>}}
def hello():
    print("hi")
{{</* /highlight */>}}
{{</* admonition type="tip" title="提示" */>}}
这是一段提示框内容。type 可选：note / tip / info / warning / danger
{{</* /admonition */>}}
{{</* tabs */>}}
{{</* tab "Mac" */>}} 用 brew install hugo {{</* /tab */>}}
{{</* tab "Linux" */>}} 用 apt install hugo {{</* /tab */>}}
{{</* /tabs */>}}
{{</* button href="/posts/" */>}}返回首页{{</* /button */>}}
{{</* youtube id="dQw4w9WgXcQ" */>}}
{{</* gallery */>}}
![a](/img/1.jpg)
![b](/img/2.jpg)
{{</* /gallery */>}}
{{</* lead */>}}
大字摘要文本。视觉上比正文更大、更醒目。
{{</* /lead */>}}
```

### 4.3 Hugo 内置（不依赖主题）

```markdown
{{</* figure src="..." */>}}  # Hugo 自带，比 blowfish 简单一点
{{</* ref "/posts/foo.md" */>}}  # 站内相对链接（编译时变成 /posts/foo/）
{{</* relref "foo.md" */>}}  # 同上，更短
{{</* include "partial.html" */>}}  # 嵌入另一个模板
```

### 4.4 数学 / 图表（要 config 启用）

```markdown
{{</* katex */>}}
\\( E = mc^2 \\)
{{</* /katex */>}}

\`\`\`mermaid
graph TD
    A[写文章] --> B{草稿?}
    B -->|是| C[本地预览]
    B -->|否| D[git push]
\`\`\`
```

启用方式见本文末尾"扩展开关"。

## 5. 图片和静态资源

### 5.1 放在 `static/` 下

```
static/
├── img/
│   ├── posts-cover.jpg
│   └── csapp-01/      # ← 也可以按文章分子目录
│       └── diagram.png
```

引用时用**绝对路径**：

```markdown
![示意图](/img/csapp-01/diagram.png)
```

Hugo 会把 `static/` 原样复制到 `public/` 下，URL 直接是 `/img/...`。

### 5.2 放在 content 同目录（Page Bundle）

如果用 Page Bundle（推荐），图片**就放在文章同一目录**：

```
content/posts/csapp/
├── _index.md
├── csapp-01.md
└── diagram.png          # ← 同目录
```

引用：

```markdown
{{< figure src="diagram.png" >}}
# 或
![示意图](diagram.png)
```

好处是**文章迁移时图片跟着走**，不会因重命名而断链。

## 6. 草稿 vs 发布

- `draft = true` + `hugo server -D` —— 本地能看
- `draft = true` + `hugo`（无 `-D`）—— 不出现在最终站点
- `draft = false` —— 任何模式都出现

**发布流程**：写文章时 `draft = true` 防止 git push 后被 CI 部署。定稿后改 `false` 再 commit。

## 7. 多版本与多语言

### 7.1 同一篇文章多语言版

```
content/posts/csapp/
├── csapp-01.md      # 默认语言（site config 里 defaultContentLanguage）
├── csapp-01.en.md   # 英文版
└── csapp-01.ja.md   # 日文版
```

需要 `config/_default/languages.toml` 启用 i18n。本站**目前没启用**。

### 7.2 文章归档 vs 隐藏

不删文件但让它从列表里消失：

```toml
[build]
  list = "never"     # 不在任何列表页出现
  publishResources = false
```

或者更简单：直接 `draft = true` + 加个注释。

## 8. 系列（series）管理

本站用的是 **Page Bundle + frontmatter series 字段**组合：

```
content/posts/
├── csapp/
│   ├── _index.md                   # series 标题 / 简介 / weight
│   ├── csapp-01-data-rep.md
│   ├── csapp-02-machine.md
│   └── csapp-03-memory.md
└── hugo-build/
    ├── _index.md
    ├── hello-rhine-lab.md
    ├── hugo-build-notes.md
    └── particles-and-glow.md
```

每篇文章里：

```toml
series = ['Hugo 建站实战']
series_order = 1     # ← 决定 <details> summary 列表里的顺序
```

**两种效果**：

1. 文章末尾的 `<details>` summary 折叠列表（"这篇文章属于一个选集"）→ 来自 `series` + `series_order`
2. `/series/<name>/` 页面 → 来自 taxonomy（blowfish 的 series taxonomy 抓 `series` 字段生成）

文件夹（`_index.md` 控制 section 页）跟 series taxonomy 是**两套并行机制**：

- 文件夹：物理分组，本地浏览直观
- series 字段：taxonomy 分类，跨文件夹聚合

两者**独立** —— 同一篇文章可以**同时**在 `csapp/` 文件夹里 + 标 `series = ['CSAPP']`，互不冲突。

## 9. 完整模板（复制粘贴用）

### 9.1 普通文章模板

```toml
+++
date = YYYY-MM-DD
draft = true
title = '文章标题'
summary = '一句话摘要，会出现在卡片副文本。'
authors = ['你的名字']
showDate = true
showReadingTime = true
showSummary = true
series = ['可选系列名']
series_order = 1                  # 仅当有 series 时
categories = ['分类']
tags = ['标签1', '标签2']
showTableOfContents = true        # 长文建议
+++

正文从这里写起。
```

### 9.2 series `_index.md` 模板

```toml
+++
title = "系列名（用户看到的标题）"
date = YYYY-MM-DD
draft = false
weight = 10                       # 数字小 = 靠前
summary = "系列简介，出现在 section 卡片副文本。"
+++

（可选）section 页正文，会渲染在列表卡片下方。
```

## 10. 扩展开关（config/_default/params.toml）

要启用 admonition、figure、tabs 等 shortcode，blowfish 主题**默认已经启用**大部分。需要手动开：

```toml
# config/_default/params.toml
enableImageZoom = true
enableSearch = true

[social]
  twitter = true
  github = true

# 数学公式
[outputs]
  home = ["html", "rss"]

# mermaid 需要在 config.yaml 加：
[markup]
  [markup.goldmark]
    [markup.goldmark.extensions]
      [markup.goldmark.extensions.mermaid]
```

具体看 [blowfish 文档](https://blowfish.page/docs/shortcodes/)。

---

## 一句话总结

`+++` 包的是 frontmatter（每个字段对应**显示在哪里**），`_index.md` 是 section 页（`weight` 控制顺序），正文用 Markdown + blowfish shortcode。**先把这三件事想清楚，再写文章** —— 后面就是体力活了。