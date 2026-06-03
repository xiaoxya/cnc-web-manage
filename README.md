# CNC 刀具管理系统

基于 SvelteKit + Prisma ORM + MySQL/MariaDB 的 CNC 刀具全生命周期管理系统。

## 功能特性

- **刀具管理** — 增删改查、自动编码生成、规格型号管理
- **批量出入库** — 扫码/手动输入刀具编码，逐行录入或 Excel 导入导出
- **刀具维修** — 报修/维修完成流程，维修厂家管理，维修次数统计，自动带出维修前状态
- **刀具盘点** — 扫码定位，录入实际数量，差异计算，导出 Excel 报表
- **工厂管理** — 工厂维护，刀具出库到各工厂使用，在用刀具统计，刀具回收
- **刀具回收** — 从工厂回收入库，自动更新库存和状态
- **刀具报废** — 报废记录，报废刀具重新启用
- **权限控制** — 管理员/操作员两档角色，操作员仅查看权限
- **仪表盘** — 库存总览、各工厂在用统计、最近动态、报废记录
- **扫码支持** — 所有输入框兼容扫码枪快速录入，支持手机摄像头扫码

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

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆项目
git clone https://github.com/xiaoxya/cnc-web-manage.git
cd cnc-web-manage

# 安装依赖
npm install

# 配置数据库连接
cp .env.example .env

# 初始化数据库
npx prisma db push

# 初始化种子数据（管理员账号）
npx prisma db seed
```

### 运行

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm run preview
```

### 一键部署（Ubuntu / Debian）

推荐优先使用直接管道执行，它会直接从 GitHub 拉最新版 `deploy.sh` 再执行：

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh | sudo bash
```

如果你更想保留一个本地临时文件，也可以用 bootstrap 入口：

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/bootstrap-deploy.sh -o /tmp/cnc-web-manage-bootstrap.sh
sudo bash /tmp/cnc-web-manage-bootstrap.sh
```

正常情况下也可以直接在仓库目录里执行 `deploy.sh`：

```bash
sudo bash deploy.sh
```

可选参数：

```bash
sudo APP_PORT=3000 DOMAIN=example.com bash deploy.sh
```

默认部署会把完整日志写入 `/tmp/cnc-web-manage-deploy.log`，终端只显示开始、完成和失败错误摘要。需要看完整过程时再加 `--verbose`；需要调试脚本时再加 `--debug`。

部署完成后，服务器上会生成：

- `deploy-info.txt`：数据库用户名、密码、库名
- `deploy-info.md`：迁移、备份、回滚命令说明

### 数据库迁移与回滚

```bash
cd /opt/cnc-web-manage
npm ci --include=dev
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma db seed
npx svelte-kit sync
npm run build
npm prune --omit=dev
sudo systemctl restart cnc-web-manage
```

数据库备份：

```bash
mysqldump -u cnc_user -p cnc_manage > backup.sql
```

数据库恢复：

```bash
mysql -u cnc_user -p cnc_manage < backup.sql
```

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 操作员 | operator | operator123 |

## 项目结构

```
src/
├── lib/
│   ├── components/       # 通用组件（ScanInput, Modal 等）
│   ├── server/
│   │   ├── auth.ts       # JWT 认证
│   │   ├── db.ts         # Prisma 客户端
│   │   └── validation.ts # 校验工具
│   ├── schemas/          # Zod 校验 schema
│   └── utils.ts          # 工具函数
├── routes/
│   ├── api/
│   │   ├── tools/        # 刀具 CRUD API
│   │   ├── factories/    # 工厂 API
│   │   ├── stocktaking/  # 盘点 API
│   │   ├── maintenance/  # 维修 API
│   │   └── auth/         # 登录/注册 API
│   └── app/              # 前端页面
│       ├── tools/        # 刀具管理页面
│       ├── factories/    # 工厂管理页面
│       ├── stocktaking/  # 盘点管理页面
│       ├── maintenance/  # 维修管理页面
│       └── ...           # 其他页面
└── app.html
```

## 数据库

项目使用 Prisma ORM，当前 schema 配置为 MySQL。

1. 创建 `.env` 文件并设置 `DATABASE_URL`
2. 确认 `prisma/schema.prisma` 中的 datasource provider 为 `mysql`
3. 运行 `npx prisma db push`

## License

MIT
