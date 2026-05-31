# CNC 刀具管理系统

基于 SvelteKit + Prisma ORM + MySQL/MariaDB 的 CNC 刀具全生命周期管理系统。

## 功能特性

- **刀具管理** — 增删改查、自动编码生成、规格型号管理
- **批量出入库** — 扫码/手动输入刀具编码，逐行录入或 Excel 导入
- **刀具维修** — 报修/维修完成流程，维修厂家管理，维修次数统计
- **刀具盘点** — 扫码定位，录入实际数量，差异计算，导出报告
- **工厂管理** — 工厂维护，刀具出库到各工厂使用，在用刀具统计
- **刀具回收** — 从工厂回收入库，自动更新库存和状态
- **权限控制** — 管理员/操作员两档角色，操作员仅查看权限
- **仪表盘** — 库存总览、低库存预警、工厂在用统计、最近动态
- **扫码支持** — 所有输入框兼容扫码枪快速录入

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | SvelteKit (TypeScript) |
| UI 样式 | Tailwind CSS |
| 数据库 | MySQL / MariaDB |
| ORM | Prisma |
| 认证方式 | JWT (HttpOnly Cookie) |
| 密码加密 | bcrypt |
| Excel 处理 | exceljs |
| 表单校验 | Zod |

## 环境要求

- Node.js >= 18
- MySQL >= 5.7 或 MariaDB >= 10.6
- npm

## 快速开始（开发环境）

### 1. 克隆项目

```bash
git clone https://github.com/xiaoxya/cnc-web-manage.git
cd cnc-web-manage
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置数据库

创建数据库：

```sql
CREATE DATABASE cnc_manage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

编辑 `.env` 文件：

```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/cnc_manage"
JWT_SECRET="your-jwt-secret-here"
```

### 4. 初始化数据库

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 操作员 | operator | operator123 |

## 项目结构

```
cnc-web-manage/
├── prisma/
│   ├── schema.prisma       # 数据库模型
│   └── seed.ts             # 种子数据
├── src/
│   ├── lib/
│   │   ├── server/         # 服务端逻辑 (auth, db, permissions, validation)
│   │   ├── components/     # 组件 (ScanInput, UI 组件库)
│   │   ├── schemas/        # Zod 校验
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数 (编码生成等)
│   ├── routes/
│   │   ├── login/          # 登录页
│   │   ├── +page.svelte    # 入口重定向
│   │   ├── app/            # 主应用
│   │   │   ├── +page.svelte        # 仪表盘
│   │   │   ├── tools/              # 刀具管理
│   │   │   ├── maintenance/        # 维修管理
│   │   │   ├── stocktaking/        # 盘点管理
│   │   │   └── settings/           # 系统设置
│   │   └── api/            # API 接口
│   ├── app.css             # 全局样式
│   └── app.html            # HTML 模板
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 刀具编码规则

格式：`{分类缩写}-{4位序号}`

示例：`LAT-0001`（车刀）、`MIL-0001`（铣刀）、`DRL-0001`（钻头）

序号按分类独立递增，数据库事务保证原子性。

## 一键部署（推荐）

将以下命令复制到 Linux 服务器终端执行：

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh | sudo bash
```

或先下载再执行：

```bash
wget https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh
chmod +x deploy.sh
sudo bash deploy.sh
```

脚本会自动完成：

1. 检测操作系统（Debian/Ubuntu/CentOS/RHEL）
2. 安装 Node.js 20 + MariaDB
3. 创建数据库和用户（自动生成密码）
4. 克隆项目、安装依赖、构建
5. 配置 PM2 进程守护 + 开机自启
6. 配置 Nginx 反向代理
7. 配置防火墙
8. 可选 SSL 证书（Let's Encrypt）

## Linux 部署（手动）

### 前置条件

1. 一台 Linux 服务器（推荐 Ubuntu 20.04+ / CentOS 8+ / Debian 11+）
2. 已安装 Node.js >= 18 和 npm
3. 已安装 MySQL/MariaDB 并运行

### 步骤一：安装 Node.js（如未安装）

**Ubuntu/Debian：**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL：**

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

验证安装：

```bash
node -v   # 应 >= 18
npm -v
```

### 步骤二：安装 MySQL/MariaDB（如未安装）

**Ubuntu/Debian（MariaDB）：**

```bash
sudo apt-get update
sudo apt-get install -y mariadb-server
sudo mysql_secure_installation
```

**CentOS/RHEL（MariaDB）：**

```bash
sudo yum install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

### 步骤三：创建数据库和用户

```sql
sudo mysql -u root

CREATE DATABASE cnc_manage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cnc_user'@'localhost' IDENTIFIED BY 'your_db_password';
GRANT ALL PRIVILEGES ON cnc_manage.* TO 'cnc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 步骤四：部署项目

```bash
# 1. 将项目上传到服务器（或直接 git clone）
cd /opt
git clone https://github.com/xiaoxya/cnc-web-manage.git
cd cnc-web-manage

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env   # 如果没有 .env.example，直接创建 .env
nano .env
```

编辑 `.env`：

```env
DATABASE_URL="mysql://cnc_user:your_db_password@localhost:3306/cnc_manage"
JWT_SECRET="请生成一个随机字符串替换此处"
NODE_ENV=production
PORT=3000
```

> **重要**：`JWT_SECRET` 必须是随机字符串，建议使用以下命令生成：
>
> ```bash
> openssl rand -base64 32
> ```

### 步骤五：初始化数据库

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 步骤六：构建并启动

```bash
# 构建生产版本
npm run build

# 启动服务（直接运行）
node build

# 或使用 PORT 环境变量指定端口
PORT=3000 node build
```

服务默认监听 `http://0.0.0.0:3000`

### 步骤七：配置进程守护（推荐使用 PM2）

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start build/index.js --name cnc-web-manage

# 设置开机自启
pm2 startup systemd
pm2 save

# 常用命令
pm2 status              # 查看状态
pm2 logs cnc-web-manage # 查看日志
pm2 restart cnc-web-manage
pm2 stop cnc-web-manage
```

### 步骤八：配置反向代理（Nginx）

安装 Nginx：

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# CentOS/RHEL
sudo yum install -y nginx
```

创建站点配置 `/etc/nginx/sites-available/cnc-manage`（Ubuntu/Debian）或 `/etc/nginx/conf.d/cnc-manage.conf`（CentOS）：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    client_max_body_size 10M;     # 支持 Excel 文件上传

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点并重载：

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/cnc-manage /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
```

### 步骤九：配置防火墙

```bash
# 仅开放必要端口
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS（如有 SSL）
sudo ufw allow 22/tcp     # SSH
sudo ufw deny 3000/tcp    # 禁止直接访问应用端口
sudo ufw enable
```

### 更新部署

后续更新代码时：

```bash
cd /opt/cnc-web-manage
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart cnc-web-manage
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 数据库连接串 | `mysql://user:pass@localhost:3306/cnc_manage` |
| `JWT_SECRET` | JWT 签名密钥（生产环境必填） | `openssl rand -base64 32` 生成 |
| `NODE_ENV` | 运行环境 | `production` / `development` |
| `PORT` | 监听端口（可选） | `3000` |

## 权限矩阵

| 功能 | 管理员 | 操作员 |
|------|--------|--------|
| 刀具查看/搜索 | ✅ | ✅ |
| 刀具新增/编辑 | ✅ | ✅ |
| 刀具报废 | ✅ | ❌ |
| 批量出入库 | ✅ | ✅ |
| 工厂回收 | ✅ | ✅ |
| 报修/维修 | ✅ | ✅ |
| 盘点 | ✅ | ✅ |
| 系统设置 | ✅ | ❌ |
| 用户管理 | ✅ | ❌ |