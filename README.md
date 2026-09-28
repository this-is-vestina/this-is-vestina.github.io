# Personal Site

Hugo + Blowfish 主题构建的个人站点。

> 工作目录：`E:\wqx\Program_sum\sites\my_blog`

## 快速开始

### 前置要求

- Hugo Extended v0.165.0
- Git

### 本地预览

```bash
hugo server --buildDrafts --navigateToChanged
# 访问 http://localhost:1313/
```

### 构建生产版本

```bash
hugo --minify
# 产物在 ./public/ 目录
```

### 创建新内容

```bash
hugo new content posts/my-new-post.md     # 博客
hugo new content projects/my-project.md  # 作品集
```

### 管理背景音乐

MP3 放在 `static/music/`，文件名仅允许字母/数字/下划线/连字符/空格和 `.mp3` 后缀。

修改后重新生成清单：

```bash
python scripts/build-music-manifest.py
# 写入 static/music/manifest.json
```

播放器读取该清单来发现曲目，添加/删除 mp3 后必须重新生成才会生效。

## 自定义样式

| 文件 | 作用 |
|---|---|
| `assets/css/custom.css` | 站点专属样式覆盖（自动加载） |
| `config/_default/params.toml` | 主题参数（深色模式、布局、字体） |
| `config/_default/languages.zh-cn.toml` | 站点标题 / 作者信息 |
| `config/_default/menus.zh-cn.toml` | 顶部导航 |

## 部署

仓库已配置 GitHub Actions 推送自动部署：[`.github/workflows/hugo.yml`](.github/workflows/hugo.yml)

每次 push 到 `main` 后：

1. 进入 https://github.com/this-is-vestina/this-is-vestina.github.io/actions 查看进度
2. 绿色完成后访问 https://this-is-vestina.github.io/

首次启用 Pages：

1. Settings -> Pages -> Source 选 "GitHub Actions"

## 常用命令

| 命令 | 作用 |
|---|---|
| `hugo server -D` | 启动开发服务器（含草稿） |
| `hugo --minify` | 生产构建 |
| `hugo new content posts/foo.md` | 新建博客草稿 |
| `python scripts/build-music-manifest.py` | 重新生成音乐清单 |
| `git submodule update --remote --merge` | 升级 Blowfish 主题 |

## 项目结构

```
.
├── archetypes/default.md        # 新内容模板
├── assets/css/custom.css        # 站点专属样式
├── config/_default/             # 主题配置
├── content/
│   ├── posts/                   # 博客
│   └── projects/                # 作品集
├── scripts/
│   └── build-music-manifest.py  # 音乐清单生成脚本
├── static/
│   └── music/                   # MP3 + manifest.json
├── themes/blowfish/             # Blowfish 主题（git submodule）
└── .github/workflows/hugo.yml   # 部署
```

## License

源码部分 MIT，详见 [LICENSE](LICENSE)。站点内的文字、图片、音乐内容版权归作者所有。