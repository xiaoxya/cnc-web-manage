# CNC 刀具管理系统

基于 SvelteKit + Prisma ORM + MariaDB 的 CNC 刀具全生命周期管理系统。

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
| 数据库 | MariaDB |
| ORM | Prisma |
| 认证方式 | JWT (HttpOnly Cookie) |
| 密码加密 | bcrypt |
| Excel 处理 | exceljs |
| 表单校验 | Zod |

## 环境要求

- Node.js >= 18
- MariaDB >= 10.6
- npm

## 快速开始

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

创建 MariaDB 数据库：

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
npx prisma migrate dev --name init
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
│   │   ├── server/         # 服务端逻辑 (auth, db, permissions)
│   │   ├── components/     # 组件 (ScanInput, UI组件库)
│   │   ├── schemas/        # Zod 校验
│   │   └── utils/          # 工具函数 (编码生成等)
│   ├── routes/
│   │   ├── login/          # 登录页
│   │   └── app/            # 主应用
│   │       ├── +page.svelte        # 仪表盘
│   │       ├── tools/              # 刀具管理
│   │       ├── maintenance/        # 维修管理
│   │       ├── stocktaking/        # 盘点管理
│   │       └── settings/           # 系统设置
│   └── api/                # API 接口
└── package.json
```

## 刀具编码规则

格式：`{分类缩写}-{4位序号}`

示例：`LAT-0001`（车刀）、`MIL-0001`（铣刀）、`DRL-0001`（钻头）

序号按分类独立递增，数据库事务保证原子性。

## 部署

### 生产构建

```bash
npm run build
node build
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 数据库连接串 | `mysql://user:pass@localhost:3306/cnc_manage` |
| `JWT_SECRET` | JWT 签名密钥 | `your-secret-key` |
| `PORT` | 监听端口（可选） | `3000` |

## 权限矩阵

| 功能 | 管理员 | 操作员 |
|------|--------|--------|
| 刀具查看/搜索 | ✓ | ✓ |
| 刀具新增/编辑 | ✓ | ✗ |
| 刀具报废 | ✓ | ✗ |
| 批量出入库 | ✓ | ✗ |
| 工厂回收 | ✓ | ✗ |
| 报修/维修 | ✓ | ✓ |
| 盘点 | ✓ | ✓ |
| 系统设置 | ✓ | ✗ |
| 用户管理 | ✓ | ✗ |
