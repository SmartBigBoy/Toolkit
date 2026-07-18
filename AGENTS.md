# 在线工具箱 - AGENTS.md

## 项目概述

纯静态 HTML/CSS/JavaScript Web 项目，集合了多种实用在线工具，包括 JSON 格式化、时间戳转换、Base64 编码、颜色拾取器、计算器等常用工具。

## 技术栈

- **语言**: HTML5 + CSS3 + JavaScript (ES6+)
- **样式**: 原生 CSS（CSS 变量管理主题样式）
- **脚本**: 原生 JavaScript（模块化组织）
- **框架依赖**: 无
- **构建工具**: 无
- **包管理器**: 无

## 目录结构

```
/workspace/projects/
├── .coze                    # 项目 .coze 配置
├── scripts/                 # 预览和部署脚本
│   ├── coze-preview-build.sh
│   ├── coze-preview-run.sh
│   ├── coze-deploy-build.sh
│   └── coze-deploy-run.sh
├── index.html               # 主入口页面
├── styles.css               # 样式文件
├── script.js                # 主脚本
├── js/                      # JS 辅助模块
│   ├── main.js
│   └── tools/
├── css/                     # CSS 辅助样式
│   └── style.css
├── tools/                   # 各工具页面
│   ├── json.html
│   ├── base64.html
│   ├── timestamp.html
│   ├── color.html
│   ├── qrcode.html
│   └── ...
└── 功能需求表格.md           # 需求文档
```

## 关键入口 / 核心模块

- **主入口**: `/workspace/projects/index.html`
- **工具页面**: `/workspace/projects/tools/` 目录下各工具 HTML
- **主样式**: `/workspace/projects/css/style.css`
- **主脚本**: `/workspace/projects/script.js`

## 运行与预览

### 预览服务

```bash
# 构建准备（验证文件存在）
bash scripts/coze-preview-build.sh

# 启动预览服务（5000 端口）
bash scripts/coze-preview-run.sh
```

预览服务使用 Python `http.server` 提供静态文件服务，监听 `0.0.0.0:5000`。

### 部署服务

部署配置与预览相同，使用同一套脚本：
- `deploy.build`: 验证项目文件存在
- `deploy.run`: 启动静态服务器（5000 端口）

## .coze 配置说明

```toml
[project]
sub_id = "1afd75b2"
name = "tools-box"
requires = []            # 纯静态项目，无运行时依赖
project_type = "web"

[preview]
preview_enable = "enabled"

[dev]
build = ["bash", "scripts/coze-preview-build.sh"]
run = ["bash", "scripts/coze-preview-run.sh"]

[deploy]
build = ["bash", "scripts/coze-deploy-build.sh"]
run = ["bash", "scripts/coze-deploy-run.sh"]

[deploy.profile]
kind = "service"
flavor = "web"
```

## 用户偏好与长期约束

1. **纯静态项目原则**: 不引入任何框架依赖（无 Vite/React/Vue 等）
2. **端口固定**: 所有 HTTP 服务必须使用 5000 端口
3. **Python HTTP Server**: 预览和部署均使用 Python `http.server`
4. **GitHub Pages 部署**: 项目文件直接位于根目录，可直接部署到 GitHub Pages

## 常见问题和预防

1. **路径问题**: 脚本使用硬编码路径 `/workspace/projects`
2. **端口占用**: 脚本已实现幂等性（先清理 5000 端口再启动）
3. **Python 依赖**: 部署环境需预装 Python3
4. **GitHub Pages**: 部署时确保 `_config.yml` 中 `baseurl` 为空，或根据需要配置
