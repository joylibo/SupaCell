# SupaCell ⚡️

SupaCell 是一个高性能、流式的轻量化电子表格 Web 应用。基于 Next.js 与 Zustand 构建，核心主打在内存中急速操作。特色功能：支持创建「AI 智能列」，通过设定 Prompt 即可在前端以高并发队列模式直接调用大模型（DeepSeek, Qwen等）对任意同行数据进行智能生成。

## 🌟 核心特性
1. **纯前端与内存驱动**: 万行数据虚拟化滚动依然丝滑，不需要后端数据库也能快速运转。
2. **AI 无缝整合**: 只需新建 "AI 自动生成" 列，绑定模型，写好 Prompt，即可一键批量补全。
3. **高并发与流式响应**: 通过自带的并发队列控制器，同时向大模型发起多个请求，提升生成效率。
4. **导入与导出**: 无缝兼容 CSV/Excel 的一键全量读写及部分选定导出。

---

## 🚀 Ubuntu 服务器部署指南

本项目**并非**依赖于 Vercel 绑定的专有功能。作为标准的 Next.js 应用，你可以将其部署在任何拥有 Node.js 环境的主机上，例如一台装有 Ubuntu 系统的云服务器。以下是使用标准 Node.js + PM2 + Nginx 的部署参考流程：

### 1. 准备服务器环境
SSH 登录到你的 Ubuntu 服务器，首先确保安装了 Node.js （推荐 Node 18+）与核心运行工具 `pm2`。
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (以 Node.js 20 为例)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（Node 项目进程守护工具）
sudo npm install -g pm2
```

### 2. 获取代码与安装依赖
将项目克隆到你的服务器（如放到 `/var/www/supacell`），或者通过传压缩包的方式传入。

```bash
# 进入部署目录
cd /var/www/supacell

# 安装项目依赖
npm install
```

### 3. 配置环境变量
如果你需要用到 AI 智能列，请务必准备好各家大模型的 API Key。
在项目根目录创建 `.env.local` 文件：

```bash
cp .env.example .env.local
nano .env.local
```
确保在里面存入正确的配置，例如：
```ini
DEEPSEEK_API_KEY="sk-......"
QWEN_API_KEY="sk-......"
```

### 4. 构建生产版本
安装依赖和配置变量全部完成后，执行 Next.js 的构建命令以打包出生产优化的代码：

```bash
npm run build
```
*(如果这一步成功，终端会提示生成了 `.next` 目录及其分析结果)*

### 5. 使用 PM2 启动服务
不要直接用 `npm start`，因为你断开 SSH 服务就会停。\
我们将使用 PM2 启动生产级服务器并在后台守护运行，默认它会监听 `3000` 端口。

```bash
pm2 start npm --name "supacell" -- start

# 如果希望开机自动重启 PM2 托管的任务：
pm2 startup
pm2 save
```

### 6. (可选) 配置 Nginx 反向代理
为了通过 80 或 443 端口，并且绑定你自己的域名进行访问，建议在前面用 Nginx 进行反代。

```bash
# 安装 Nginx
sudo apt install nginx -y
```

新建一个网站配置文件，例如 `/etc/nginx/sites-available/supacell`：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

将该配置启用并重启 Nginx：
```bash
# 建立软链接到启用目录
sudo ln -s /etc/nginx/sites-available/supacell /etc/nginx/sites-enabled/

# 测试一下配置语法有无错误
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

完成！你现在可以通过绑定的域名或者该服务器的公网 IP 访问 SupaCell 这个轻量级电子表格应用了。
