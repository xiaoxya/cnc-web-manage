# CNC 刀具管理系统操作文档与数据库备份步骤

本文档用于现场操作、服务器维护、数据库备份和迁移恢复。默认部署目录为 `/opt/cnc-web-manage`，如实际目录不同，请以服务器上的 `deploy-info.txt` 为准。

## 1. 登录与权限

访问系统地址：

```text
http://服务器IP
https://域名
```

默认账号：

| 角色 | 用户名 | 默认密码 | 权限说明 |
| --- | --- | --- | --- |
| 管理员 | admin | admin123 | 可新增、编辑、出入库、维修、盘点、系统设置 |
| 操作员 | operator | operator123 | 主要用于查看和扫码操作 |

首次上线后建议立刻在“系统设置 - 用户管理”中修改默认密码。

手机摄像头扫码需要使用 `https://域名` 访问。使用 `http://服务器IP` 时，手机浏览器通常会禁止调用摄像头。

## 2. 日常操作流程

### 2.1 系统设置

先维护基础数据：

1. 进入“系统设置”。
2. 维护“分类管理”：填写编码前缀、名称、描述。
3. 维护“规格型号”：填写型号名称，并选择所属分类。
4. 维护“库位管理”：填写库位编码、名称。
5. 维护“工厂管理”：填写工厂编码、名称。
6. 维护“维修厂家”：填写维修厂家名称。
7. 维护“用户管理”：添加操作员或管理员账号。

### 2.2 新增刀具

1. 进入“刀具管理 - 全部刀具”。
2. 点击“新增刀具”。
3. 选择分类、库位、规格型号，填写刀具名称、材质、品牌、数量等信息。
4. 提交后系统自动生成刀具编码，编码格式为 `Q00001`、`Q00002` 递增。

### 2.3 刀具出库

单把出库：

1. 进入“刀具管理 - 全部刀具”。
2. 在目标刀具操作列点击“出库”。
3. 选择目标工厂并确认。

批量出库：

1. 进入“刀具管理 - 批量出库”。
2. 扫码或手动输入刀具编码。
3. 选择目标工厂。
4. 确认出库。

出库后刀具会进入“工厂在用”状态。

### 2.4 刀具回收

1. 进入“刀具管理 - 工厂在用”。
2. 根据工厂或刀具编码查找刀具。
3. 点击“回收”。
4. 确认后刀具恢复为在库。

### 2.5 刀具维修

报修：

1. 进入“刀具维修”。
2. 扫码或输入刀具编码。
3. 选择维修厂家，填写故障描述。
4. 提交后刀具进入维修中。

维修完成：

1. 进入“刀具维修”。
2. 点击维修记录详情。
3. 点击“标记为维修完成”。
4. 填写维修费用、维修厂家、备注。
5. 确认完成。

注意：

- 维修前是“在库”的刀具，完成后恢复为“在库”。
- 维修前是“工厂在用”的刀具，完成后恢复为“使用中”，不会增加全部刀具库存数量。

### 2.6 维修统计

进入“刀具维修 - 维修统计”后，可以按维修厂家、年份、月份筛选。

统计内容包括：

- 维修总次数
- 维修中数量
- 维修总费用
- 按维修厂家和刀具编码统计维修次数
- 按月份统计维修次数和费用
- 刀具维修次数排行

### 2.7 盘点

1. 进入“盘点管理”。
2. 新建盘点任务，选择目标工厂。
3. 扫码录入实际刀具。
4. 系统自动计算差异。
5. 完成盘点后可导出 Excel。

## 3. 部署与服务维护

进入服务器应用目录：

```bash
cd /opt/cnc-web-manage
```

查看服务状态：

```bash
sudo systemctl status cnc-web-manage --no-pager
sudo systemctl status nginx --no-pager
sudo systemctl status mariadb --no-pager
```

重启服务：

```bash
sudo systemctl restart cnc-web-manage
sudo systemctl reload nginx
```

查看应用日志：

```bash
sudo journalctl -u cnc-web-manage -n 100 --no-pager
sudo journalctl -u cnc-web-manage -f
```

重新部署最新版：

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh | sudo bash
```

查看部署日志：

```bash
tail -n 120 /tmp/cnc-web-manage-deploy.log
```

## 4. 数据库账号位置

一键部署完成后，数据库信息会保存在应用目录：

```bash
sudo cat /opt/cnc-web-manage/deploy-info.txt
sudo cat /opt/cnc-web-manage/deploy-info.md
```

常见内容如下：

```text
MySQL database: cnc_manage
MySQL user: cnc_user
MySQL password: 这里是实际密码
MySQL host: localhost
MySQL port: 3306
```

后续备份、迁移、恢复数据库时，优先使用这里记录的用户名和密码。

## 5. 手动备份数据库

### 5.1 创建备份目录

```bash
sudo mkdir -p /opt/cnc-web-manage/backups
sudo chown -R "$USER":"$USER" /opt/cnc-web-manage/backups
```

### 5.2 读取数据库信息

如果是默认部署，一般为：

```bash
DB_NAME="cnc_manage"
DB_USER="cnc_user"
DB_HOST="localhost"
DB_PORT="3306"
```

密码请从下面文件查看：

```bash
sudo cat /opt/cnc-web-manage/deploy-info.txt
```

### 5.3 执行备份

执行后会提示输入数据库密码：

```bash
cd /opt/cnc-web-manage
mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" > "backups/cnc_manage-$(date +%F-%H%M%S).sql"
```

查看备份文件：

```bash
ls -lh /opt/cnc-web-manage/backups
```

## 6. 一键备份脚本

在服务器执行：

```bash
sudo tee /usr/local/bin/backup-cnc-db.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/cnc-web-manage"
INFO_FILE="$APP_DIR/deploy-info.txt"
BACKUP_DIR="$APP_DIR/backups"

DB_NAME="$(awk -F': ' '/MySQL database/ {print $2}' "$INFO_FILE")"
DB_USER="$(awk -F': ' '/MySQL user/ {print $2}' "$INFO_FILE")"
DB_PASS="$(awk -F': ' '/MySQL password/ {print $2}' "$INFO_FILE")"
DB_HOST="$(awk -F': ' '/MySQL host/ {print $2}' "$INFO_FILE")"
DB_PORT="$(awk -F': ' '/MySQL port/ {print $2}' "$INFO_FILE")"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-$(date +%F-%H%M%S).sql"

MYSQL_PWD="$DB_PASS" mysqldump \
  -h "${DB_HOST:-localhost}" \
  -P "${DB_PORT:-3306}" \
  -u "$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" > "$BACKUP_FILE"

gzip "$BACKUP_FILE"
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -type f -mtime +30 -delete

echo "Backup created: ${BACKUP_FILE}.gz"
EOF

sudo chmod +x /usr/local/bin/backup-cnc-db.sh
```

立即执行一次备份：

```bash
sudo /usr/local/bin/backup-cnc-db.sh
```

## 7. 定时自动备份

每天凌晨 2 点自动备份：

```bash
sudo crontab -e
```

加入一行：

```cron
0 2 * * * /usr/local/bin/backup-cnc-db.sh >> /var/log/cnc-db-backup.log 2>&1
```

查看定时任务：

```bash
sudo crontab -l
```

查看备份日志：

```bash
sudo tail -n 100 /var/log/cnc-db-backup.log
```

## 8. 恢复数据库

恢复前建议先停止应用，避免恢复过程中继续写入数据：

```bash
sudo systemctl stop cnc-web-manage
```

如果备份文件是 `.sql.gz`：

```bash
gunzip -c /opt/cnc-web-manage/backups/cnc_manage-YYYY-MM-DD-HHMMSS.sql.gz > /tmp/cnc_restore.sql
```

如果备份文件已经是 `.sql`，直接使用原文件即可。

恢复数据库：

```bash
DB_NAME="cnc_manage"
DB_USER="cnc_user"
DB_HOST="localhost"
DB_PORT="3306"

mysql \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p \
  "$DB_NAME" < /tmp/cnc_restore.sql
```

恢复后重新应用迁移并重启服务：

```bash
cd /opt/cnc-web-manage
npx prisma migrate deploy
npx prisma generate
sudo systemctl start cnc-web-manage
sudo systemctl status cnc-web-manage --no-pager
```

## 9. 迁移到新服务器

旧服务器备份：

```bash
sudo /usr/local/bin/backup-cnc-db.sh
ls -lh /opt/cnc-web-manage/backups
```

把备份文件传到新服务器：

```bash
scp /opt/cnc-web-manage/backups/cnc_manage-YYYY-MM-DD-HHMMSS.sql.gz root@新服务器IP:/tmp/
```

新服务器部署系统：

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh | sudo bash
```

新服务器恢复数据库：

```bash
sudo systemctl stop cnc-web-manage
gunzip -c /tmp/cnc_manage-YYYY-MM-DD-HHMMSS.sql.gz > /tmp/cnc_restore.sql

DB_NAME="cnc_manage"
DB_USER="cnc_user"
DB_HOST="localhost"
DB_PORT="3306"

mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < /tmp/cnc_restore.sql

cd /opt/cnc-web-manage
npx prisma migrate deploy
npx prisma generate
sudo systemctl start cnc-web-manage
```

检查：

```bash
sudo systemctl status cnc-web-manage --no-pager
sudo systemctl status nginx --no-pager
```

## 10. 备份注意事项

- 每次系统升级前先备份数据库。
- 每次大批量导入、批量出库、批量盘点前建议先备份。
- 至少保留最近 30 天备份。
- 建议定期把备份文件复制到另一台电脑或云盘。
- 恢复数据库前确认备份文件日期，不要误恢复旧数据。
- 恢复完成后登录系统检查刀具列表、维修记录、盘点记录是否正常。

