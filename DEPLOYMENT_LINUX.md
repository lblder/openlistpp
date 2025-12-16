# OpenList + Protal PCAP 分析系统 - Linux 部署指南

## 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **CPU**: 2核心以上
- **内存**: 4GB 以上
- **硬盘**: 20GB 以上可用空间
- **网络**: 需要能访问外网（安装依赖）

## 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (反向代理)                       │
│                    Port: 80/443                          │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┐
    │                 │              │              │
┌───▼────┐      ┌────▼─────┐   ┌───▼────┐    ┌───▼────┐
│Frontend│      │ Backend  │   │ Protal │    │ Static │
│ (静态) │      │   (Go)   │   │(Python)│    │ Files  │
│        │      │Port: 5244│   │Port:   │    │        │
│        │      │          │   │  5001  │    │        │
└────────┘      └──────────┘   └────────┘    └────────┘
```

## 部署步骤

### 第一步：准备服务器环境

#### 1.1 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS
sudo yum update -y
```

#### 1.2 安装基础工具
```bash
# Ubuntu/Debian
sudo apt install -y git curl wget vim build-essential

# CentOS
sudo yum install -y git curl wget vim gcc make
```

---

### 第二步：安装 Wireshark (Tshark)

Protal 服务依赖 Wireshark 的 tshark 工具。

```bash
# Ubuntu/Debian
sudo apt install -y wireshark tshark

# CentOS
sudo yum install -y epel-release
sudo yum install -y wireshark wireshark-cli

# 验证安装
tshark --version
```

**配置非 root 用户使用 tshark**:
```bash
# 添加当前用户到 wireshark 组
sudo usermod -a -G wireshark $USER

# 配置 dumpcap 权限
sudo dpkg-reconfigure wireshark-common  # 选择 Yes
sudo chmod +x /usr/bin/dumpcap

# 重新登录使组权限生效
exit
# 重新 SSH 登录
```

---

### 第三步：安装 Python 环境 (Protal 服务)

#### 3.1 安装 Miniconda
```bash
# 下载 Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh

# 安装
bash Miniconda3-latest-Linux-x86_64.sh -b -p $HOME/miniconda3

# 初始化
$HOME/miniconda3/bin/conda init bash
source ~/.bashrc

# 验证
conda --version
```

#### 3.2 创建 Python 虚拟环境
```bash
conda create -n pcap python=3.10 -y
conda activate pcap
```

---

### 第四步：安装 Go 环境 (后端服务)

```bash
# 下载 Go 1.21+
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz

# 解压到 /usr/local
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# 配置环境变量
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export GOPATH=$HOME/go' >> ~/.bashrc
source ~/.bashrc

# 验证
go version
```

---

### 第五步：安装 Node.js 和 pnpm (前端构建)

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 或者使用 nvm (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 pnpm
npm install -g pnpm

# 验证
node --version
pnpm --version
```

---

### 第六步：部署代码

#### 6.1 创建部署目录
```bash
sudo mkdir -p /opt/openlist
sudo chown $USER:$USER /opt/openlist
cd /opt/openlist
```

#### 6.2 上传代码
```bash
# 方法1: 使用 git (推荐)
git clone <your-repo-url> .

# 方法2: 使用 scp 从本地上传
# 在本地执行:
# scp -r D:\Code\work\OL/* user@server:/opt/openlist/

# 或使用 rsync (更快)
# rsync -avz --progress D:\Code\work\OL/ user@server:/opt/openlist/
```

#### 6.3 验证目录结构
```bash
cd /opt/openlist
ls -la
# 应该看到:
# - OpenList-main/
# - OpenList-Frontend-main/
# - Protal/
```

---

### 第七步：部署 Protal 服务

```bash
cd /opt/openlist/Protal

# 激活虚拟环境
conda activate pcap

# 安装依赖
pip install -r requirements.txt

# 测试运行
python app.py
# 看到 "🌍 工控协议分析服务已启动..." 后按 Ctrl+C 停止
```

**注意**: 代码已经自动适配 Linux 系统，会自动使用 `/usr/bin/tshark`，无需手动修改配置文件。

#### 7.1 创建 systemd 服务
```bash
sudo vim /etc/systemd/system/protal.service
```

内容如下:
```ini
[Unit]
Description=Protal PCAP Analysis Service
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/openlist/Protal
Environment="PATH=/home/YOUR_USERNAME/miniconda3/envs/pcap/bin:/usr/bin"
ExecStart=/home/YOUR_USERNAME/miniconda3/envs/pcap/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**注意**: 将 `YOUR_USERNAME` 替换为实际用户名。

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable protal
sudo systemctl start protal

# 检查状态
sudo systemctl status protal

# 查看日志
sudo journalctl -u protal -f
```

---

### 第八步：部署 OpenList 后端

```bash
cd /opt/openlist/OpenList-main

# 编译 Go 程序
go build -o openlist main.go

# 测试运行
./openlist server
# 看到服务启动后按 Ctrl+C 停止
```

#### 8.1 创建 systemd 服务
```bash
sudo vim /etc/systemd/system/openlist-backend.service
```

内容如下:
```ini
[Unit]
Description=OpenList Backend Service
After=network.target protal.service
Requires=protal.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/openlist/OpenList-main
ExecStart=/opt/openlist/OpenList-main/openlist server
Restart=always
RestartSec=10
Environment="GIN_MODE=release"

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable openlist-backend
sudo systemctl start openlist-backend

# 检查状态
sudo systemctl status openlist-backend
```

---

### 第九步：构建并部署前端

```bash
cd /opt/openlist/OpenList-Frontend-main

# 安装依赖
pnpm install

# 配置生产环境 API 地址
vim .env.production
# 内容: VITE_API_URL = "/"

# 构建生产版本
pnpm build

# 构建产物在 dist/ 目录
ls -la dist/
```

---

### 第十步：安装和配置 Nginx

#### 10.1 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS
sudo yum install -y nginx

# 启动 Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 10.2 配置 Nginx
```bash
sudo vim /etc/nginx/sites-available/openlist
```

内容如下:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP

    # 前端静态文件
    root /opt/openlist/OpenList-Frontend-main/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:5244;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # PCAP 解析可能需要较长时间
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 日志
    access_log /var/log/nginx/openlist_access.log;
    error_log /var/log/nginx/openlist_error.log;
}
```

#### 10.3 启用配置
```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/openlist /etc/nginx/sites-enabled/

# CentOS (直接编辑主配置)
# sudo vim /etc/nginx/nginx.conf
# 在 http 块中 include 上面的配置

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

### 第十一步：配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

### 第十二步：配置 PCAP 文件存储

```bash
# 创建 PCAP 文件存储目录
sudo mkdir -p /opt/openlist/data/pcap
sudo chown $USER:$USER /opt/openlist/data/pcap

# 配置 OpenList 存储 (根据你的 OpenList 配置)
# 确保虚拟文件系统路径 /keti1/data/pcap 映射到 /opt/openlist/data/pcap
```

---

## 验证部署

### 1. 检查所有服务状态
```bash
sudo systemctl status protal
sudo systemctl status openlist-backend
sudo systemctl status nginx
```

### 2. 测试 Protal 服务
```bash
curl http://localhost:5001/
# 应该返回服务状态 JSON
```

### 3. 测试后端 API
```bash
curl http://localhost:5244/api/ping
# 应该返回 "pong"
```

### 4. 访问前端
打开浏览器访问: `http://your-server-ip`

### 5. 测试 PCAP 解析
1. 上传测试 PCAP 文件到 `/opt/openlist/data/pcap/`
2. 在前端页面进入 "数据集成" → "数据解析"
3. 选择文件并点击"开始解析"

---

## 日志查看

```bash
# Protal 服务日志
sudo journalctl -u protal -f

# 后端服务日志
sudo journalctl -u openlist-backend -f

# Nginx 访问日志
sudo tail -f /var/log/nginx/openlist_access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/openlist_error.log
```

---

## 常见问题

### Q1: Protal 服务无法启动
```bash
# 检查 Python 环境
conda activate pcap
python --version

# 检查 tshark
which tshark
tshark --version

# 查看详细错误
sudo journalctl -u protal -n 50
```

### Q2: 后端无法连接 Protal
```bash
# 检查 Protal 是否运行
curl http://localhost:5001/

# 检查防火墙
sudo iptables -L -n | grep 5001
```

### Q3: 前端页面空白
```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查前端构建产物
ls -la /opt/openlist/OpenList-Frontend-main/dist/

# 查看浏览器控制台错误
```

### Q4: PCAP 文件列表为空
```bash
# 检查文件权限
ls -la /opt/openlist/data/pcap/

# 检查 OpenList 存储配置
# 确保虚拟路径正确映射
```

---

## 性能优化

### 1. 启用 Gzip 压缩
在 Nginx 配置中添加:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### 2. 配置 Systemd 资源限制
```bash
sudo vim /etc/systemd/system/protal.service
```
添加:
```ini
[Service]
LimitNOFILE=65536
MemoryLimit=2G
```

### 3. 配置日志轮转
```bash
sudo vim /etc/logrotate.d/openlist
```
内容:
```
/var/log/nginx/openlist_*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

---

## 安全加固

### 1. 配置 HTTPS (使用 Let's Encrypt)
```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 2. 限制 API 访问速率
在 Nginx 配置中添加:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    # ... 其他配置
}
```

### 3. 配置 SELinux (CentOS)
```bash
# 如果启用了 SELinux
sudo setsebool -P httpd_can_network_connect 1
```

---

## 备份策略

### 自动备份脚本
```bash
sudo vim /opt/openlist/backup.sh
```

内容:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/openlist"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /opt/openlist/OpenList-main/config \
    /etc/nginx/sites-available/openlist \
    /etc/systemd/system/protal.service \
    /etc/systemd/system/openlist-backend.service

# 备份 PCAP 文件 (可选)
tar -czf $BACKUP_DIR/pcap_$DATE.tar.gz /opt/openlist/data/pcap/

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# 添加执行权限
chmod +x /opt/openlist/backup.sh

# 添加到 crontab (每天凌晨 2 点备份)
crontab -e
# 添加: 0 2 * * * /opt/openlist/backup.sh >> /var/log/openlist_backup.log 2>&1
```

---

## 监控和告警

### 使用 systemd 监控服务状态
```bash
# 创建监控脚本
sudo vim /opt/openlist/monitor.sh
```

内容:
```bash
#!/bin/bash
SERVICES=("protal" "openlist-backend" "nginx")

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "ALERT: $service is not running!"
        # 可以在这里添加邮件或钉钉通知
        systemctl restart $service
    fi
done
```

```bash
chmod +x /opt/openlist/monitor.sh

# 每 5 分钟检查一次
crontab -e
# 添加: */5 * * * * /opt/openlist/monitor.sh
```

---

## 更新和维护

### 更新代码
```bash
cd /opt/openlist

# 拉取最新代码
git pull

# 重新构建后端
cd OpenList-main
go build -o openlist main.go
sudo systemctl restart openlist-backend

# 重新构建前端
cd ../OpenList-Frontend-main
pnpm install
pnpm build
sudo systemctl reload nginx

# 更新 Protal
cd ../Protal
conda activate pcap
pip install -r requirements.txt --upgrade
sudo systemctl restart protal
```

---

## 总结

部署完成后，你的系统架构如下：

- **Nginx** (80/443) → 处理 HTTP 请求和静态文件
- **OpenList Backend** (5244) → Go 后端服务
- **Protal** (5001) → Python PCAP 分析服务
- **前端** → 静态文件由 Nginx 直接服务

所有服务都通过 systemd 管理，开机自启动，自动重启。

如有问题，请查看日志文件进行排查。
