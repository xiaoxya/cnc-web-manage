# CNC 刀具管理系统

基于 **SvelteKit** + **Prisma** + **MariaDB** 的全栈 CNC 刀具全生命周期管理系统。

## 功能特性

- 🔧 **刀具管理** — 增删改查、扫码搜索、分类筛选
- 📥 **批量入库/出库** — 表格逐行录入 + Excel 导入，支持扫码枪连续录入
- 🔨 **刀具维修** — 扫码报修、维修跟踪、完成记录
- 📋 **刀具盘点** — 自动创建盘点单、扫码定位、差异计算、报告导出
- ⚙️ **系统设置** — 分类管理、库位管理、用户管理（角色权限）
- 📊 **仪表盘** — 数据概览、低库存预警、最近动态

## 快速开始

### 前置条件

- Node.js >= 18
- MariaDB >= 10.5
- npm

### 安装步骤

1. **安装依赖**

```bash
npm install
```

2. **配置数据库**

编辑 `.env` 文件：

```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/cnc_manage"
JWT_SECRET="替换为随机密钥"
```

3. **创建数据库**

```bash
mysql -u root -p -e "CREATE DATABASE cnc_manage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

4. **执行数据库迁移**

```bash
npx prisma migrate dev --name init
```

5. **导入种子数据**

```bash
npm run db:seed
```

默认账号：
- 管理员：`admin` / `admin123`
- 操作员：`operator` / `operator123`

6. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:5173

### 生产部署

```bash
npm run build
node build
```

默认监听端口 3000，可通过 `PORT` 环境变量修改。

### Prisma Studio

```bash
npx prisma studio
```

## 项目结构

```
src/
├── lib/
│   ├── components/     — UI 组件（通用 + 业务）
│   ├── schemas/        — Zod 校验
│   ├── server/         — 服务端（db, auth, permissions）
│   ├── types/          — TypeScript 类型
│   └── utils/          — 工具函数
├── routes/
│   ├── login/          — 登录页
│   ├── app/            — 主应用（需登录）
│   └── api/            — REST API
prisma/
├── schema.prisma       — 数据库模型
└── seed.ts             — 种子数据
```

## 扫码枪使用

所有搜索和录入框均支持扫码枪直接输入，无需额外配置。扫码后自动提交/跳转。
