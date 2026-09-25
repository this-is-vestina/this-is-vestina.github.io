# Rhine Lab — Personal Site

一个使用 [Hugo](https://gohugo.io/) + [Blowfish](https://blowfish.page/) 主题构建的个人站点。
视觉风格参考明日方舟「莱茵生命」运营 UI——冷蓝主色 + 深色面板 + 切角 + 等宽字体 + 数据读数。

> 📍 工作目录：`E:\wqx\Program_sum\sites\my_blog`

## 🚀 快速开始

### 前置要求

- Hugo Extended v0.163.0+（本项目用 v0.165.0）
- Git
- （可选）Node.js，仅当你需要修改 Tailwind 主题时

### 本地预览

```bash
# 启动开发服务器（默认端口 1313）
hugo server --buildDrafts --navigateToChanged

# 访问 http://localhost:1313/
```

### 构建生产版本

```bash
hugo --minify
# 产物在 ./public/ 目录
```

### 创建新文章

```bash
hugo new content posts/my-new-post.md     # 博客
hugo new content projects/my-project.md  # 作品集
```

## 🎨 莱茵生命定制

所有自定义在以下位置：

| 文件 | 作用 |
|---|---|
| `assets/css/schemes/rhine.css` | 配色方案（Tailwind token） |
| `assets/css/custom.css` | 切角、网格、字体、状态点等覆盖样式 |
| `config/_default/params.toml` | 主题参数（深色模式、布局、字体） |
| `config/_default/languages.zh-cn.toml` | 站点标题/作者信息 |
| `config/_default/menus.zh-cn.toml` | 顶部导航 |

### 修改配色

所有莱茵生命色定义在 [assets/css/schemes/rhine.css](assets/css/schemes/rhine.css)，使用 RGB 三元组格式（供 Tailwind 编译）。

### 状态点工具类

在 markdown 里直接用：

```html
<span class="rhine-dot rhine-dot-live"></span>LIVE
<span class="rhine-dot rhine-dot-warn"></span>WIP
<span class="rhine-dot rhine-dot-error"></span>FAIL
<span class="rhine-dot rhine-dot-dim"></span>ARCHIVED
```

### Chrome 标签

```html
<span class="rhine-chrome">[ SITE: RHINE-LAB.PRIVATE ] [ DR.NAME ] [ SESSION: 0xA4F2 ]</span>
```

### 数据读数

```html
<span class="rhine-data">STATUS · PROCESSING · 12.4s</span>
```

## 🚢 部署到 GitHub Pages

1. 在 GitHub 创建仓库 `<your-username>.github.io`
2. 首次推送：

   ```bash
   git remote add origin git@github.com:<your-username>/<your-username>.github.io.git
   git push -u origin main
   ```

3. 在 repo **Settings → Pages → Source** 选 "GitHub Actions"
4. 等待 Actions 完成（绿色 ✓）→ 访问 `https://<your-username>.github.io/`

部署 workflow 已包含：[`.github/workflows/hugo.yml`](.github/workflows/hugo.yml)

## 📁 项目结构

```
.
├── archetypes/default.md        # 新内容模板（含常用 frontmatter）
├── assets/
│   ├── css/
│   │   ├── custom.css           # 莱茵生命样式覆盖（自动加载）
│   │   └── schemes/rhine.css    # 配色方案
├── config/_default/             # 主题配置
│   ├── hugo.toml                # Hugo 站点主配置
│   ├── params.toml              # Blowfish 主题参数
│   ├── languages.zh-cn.toml     # 中文站名/作者
│   ├── menus.zh-cn.toml         # 顶部菜单
│   └── markup.toml              # Markdown 解析
├── content/
│   ├── about.md                 # 关于页
│   ├── posts/                   # 博客
│   └── projects/                # 作品集
├── themes/blowfish/             # Blowfish 主题（git submodule）
├── .github/workflows/hugo.yml   # GitHub Actions 部署
└── README.md
```

## 🔧 常用命令

| 命令 | 作用 |
|---|---|
| `hugo server -D` | 启动开发服务器（含草稿） |
| `hugo --minify` | 生产构建 |
| `hugo new content posts/foo.md` | 新建博客草稿 |
| `git submodule update --remote --merge` | 升级 Blowfish 主题 |
| `npm install && npm run build`（在 themes/blowfish/）| 重新编译 Tailwind（仅在改主题源码时） |

## 📝 替换占位符

以下位置用了占位符，**部署前务必替换**：

- `config/_default/hugo.toml` 中 `baseURL` → `https://<your-username>.github.io/`
- `config/_default/languages.zh-cn.toml` 中 `[params.author]`：
  - `name`
  - `links` 里的 GitHub / email

## 📄 License

MIT — 详见 [LICENSE](LICENSE)。