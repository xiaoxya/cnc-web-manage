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

手动备份适合在升级系统、批量导入、批量出库、盘点前临时执行一次。备份文件建议统一放在 `/opt/cnc-web-manage/backups`。

### 5.1 创建备份目录

```bash
sudo mkdir -p /opt/cnc-web-manage/backups
sudo chmod 750 /opt/cnc-web-manage/backups
```

### 5.2 查看数据库账号

一键部署后，数据库账号会写入：

```bash
sudo cat /opt/cnc-web-manage/deploy-info.txt
```

常见字段如下：

```text
MySQL database: cnc_manage
MySQL user: cnc_user
MySQL password: 实际密码
MySQL host: localhost
MySQL port: 3306
```

### 5.3 设置临时变量

把 `DB_PASS` 改成 `deploy-info.txt` 里看到的实际密码：

```bash
DB_NAME="cnc_manage"
DB_USER="cnc_user"
DB_PASS="这里填写实际密码"
DB_HOST="localhost"
DB_PORT="3306"
BACKUP_DIR="/opt/cnc-web-manage/backups"
```

### 5.4 执行备份

```bash
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-$(date +%F-%H%M%S).sql"

MYSQL_PWD="$DB_PASS" mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  "$DB_NAME" > "$BACKUP_FILE"

gzip "$BACKUP_FILE"
sha256sum "${BACKUP_FILE}.gz" > "${BACKUP_FILE}.gz.sha256"
```

参数说明：

- `--single-transaction`：备份 InnoDB 表时尽量不锁表，适合线上备份。
- `--routines`：备份存储过程和函数。
- `--triggers`：备份触发器。
- `--events`：备份数据库事件。
- `--default-character-set=utf8mb4`：避免中文乱码。

### 5.5 检查备份结果

```bash
ls -lh "$BACKUP_DIR"
gzip -t "${BACKUP_FILE}.gz"
sha256sum -c "${BACKUP_FILE}.gz.sha256"
```

正常结果应满足：

- 备份文件存在，后缀为 `.sql.gz`。
- 文件大小不是 `0`。
- `gzip -t` 没有报错。
- `sha256sum -c` 显示 `OK`。

## 6. 一键备份脚本

建议服务器上固定安装一个备份脚本，后续手动备份和定时备份都调用同一个脚本。

### 6.1 创建脚本

```bash
sudo tee /usr/local/bin/backup-cnc-db.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/cnc-web-manage}"
INFO_FILE="${INFO_FILE:-$APP_DIR/deploy-info.txt}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
LOG_FILE="${LOG_FILE:-/var/log/cnc-db-backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOCK_FILE="/tmp/cnc-db-backup.lock"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_FILE"
}

read_info() {
  awk -F': ' -v key="$1" '$1 == key {print $2}' "$INFO_FILE" | tail -n 1
}

if [[ ! -f "$INFO_FILE" ]]; then
  log "ERROR: database info file not found: $INFO_FILE"
  exit 1
fi

DB_NAME="$(read_info 'MySQL database')"
DB_USER="$(read_info 'MySQL user')"
DB_PASS="$(read_info 'MySQL password')"
DB_HOST="$(read_info 'MySQL host')"
DB_PORT="$(read_info 'MySQL port')"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

if [[ -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASS" ]]; then
  log "ERROR: database name/user/password is empty, please check $INFO_FILE"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "WARN: another backup process is running, skip this run"
  exit 0
fi

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-$(date +%F-%H%M%S).sql"

log "backup started: database=$DB_NAME host=$DB_HOST port=$DB_PORT"

MYSQL_PWD="$DB_PASS" mysqldump \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --default-character-set=utf8mb4 \
  "$DB_NAME" > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  log "ERROR: backup file is empty: $BACKUP_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

gzip -f "$BACKUP_FILE"
gzip -t "${BACKUP_FILE}.gz"
sha256sum "${BACKUP_FILE}.gz" > "${BACKUP_FILE}.gz.sha256"

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz.sha256" -type f -mtime +"$RETENTION_DAYS" -delete

log "backup success: ${BACKUP_FILE}.gz"
EOF
```

### 6.2 设置权限

```bash
sudo chmod 750 /usr/local/bin/backup-cnc-db.sh
sudo chown root:root /usr/local/bin/backup-cnc-db.sh
```

### 6.3 手动测试脚本

```bash
sudo /usr/local/bin/backup-cnc-db.sh
```

查看结果：

```bash
sudo tail -n 50 /var/log/cnc-db-backup.log
sudo ls -lh /opt/cnc-web-manage/backups
```

校验最新备份：

```bash
LATEST_BACKUP="$(sudo ls -t /opt/cnc-web-manage/backups/*.sql.gz | head -n 1)"
sudo gzip -t "$LATEST_BACKUP"
sudo sha256sum -c "${LATEST_BACKUP}.sha256"
```

## 7. 定时自动备份

推荐使用 `cron` 做定时备份。简单、稳定，服务器重启后仍然生效。

### 7.1 推荐备份策略

建议配置：

- 每天凌晨 `02:00` 自动备份一次。
- 备份文件保留 `30` 天。
- 每次备份生成 `.sql.gz` 和 `.sha256` 两个文件。
- 日志写入 `/var/log/cnc-db-backup.log`。
- 每周至少人工检查一次备份是否正常生成。

### 7.2 写入 cron 定时任务

编辑 root 用户的定时任务：

```bash
sudo crontab -e
```

加入下面这一行：

```cron
0 2 * * * RETENTION_DAYS=30 /usr/local/bin/backup-cnc-db.sh >/dev/null 2>&1
```

说明：

- `0 2 * * *` 表示每天凌晨 2 点执行。
- `RETENTION_DAYS=30` 表示只保留最近 30 天备份。
- 脚本自身会写日志到 `/var/log/cnc-db-backup.log`。

### 7.3 确认 cron 已保存

```bash
sudo crontab -l
```

应该能看到：

```cron
0 2 * * * RETENTION_DAYS=30 /usr/local/bin/backup-cnc-db.sh >/dev/null 2>&1
```

### 7.4 确认 cron 服务正在运行

Ubuntu / Debian：

```bash
sudo systemctl status cron --no-pager
```

如果没有运行：

```bash
sudo systemctl enable --now cron
```

部分系统服务名可能是 `crond`：

```bash
sudo systemctl status crond --no-pager
```

### 7.5 做一次立即测试

不要等到凌晨，先手动执行一次：

```bash
sudo env RETENTION_DAYS=30 /usr/local/bin/backup-cnc-db.sh
```

检查日志：

```bash
sudo tail -n 80 /var/log/cnc-db-backup.log
```

检查备份文件：

```bash
sudo ls -lh /opt/cnc-web-manage/backups
```

### 7.6 模拟 cron 环境测试

cron 的环境变量比普通终端少。为了提前发现路径问题，可以执行：

```bash
sudo env -i \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  RETENTION_DAYS=30 \
  /usr/local/bin/backup-cnc-db.sh
```

如果这个命令能成功，cron 大概率也能成功。

### 7.7 第二天检查定时备份

第二天上服务器检查：

```bash
sudo tail -n 100 /var/log/cnc-db-backup.log
sudo ls -lh /opt/cnc-web-manage/backups
```

应看到最近一次 `backup success`，并且备份目录里有当天凌晨生成的文件。

### 7.8 常见 cron 表达式

```cron
# 每天凌晨 2 点
0 2 * * * RETENTION_DAYS=30 /usr/local/bin/backup-cnc-db.sh >/dev/null 2>&1

# 每 6 小时备份一次
0 */6 * * * RETENTION_DAYS=30 /usr/local/bin/backup-cnc-db.sh >/dev/null 2>&1

# 每周日凌晨 3 点
0 3 * * 0 RETENTION_DAYS=90 /usr/local/bin/backup-cnc-db.sh >/dev/null 2>&1
```

生产环境建议每天备份一次即可；如果当天出入库和维修记录特别频繁，可以临时手动备份。

### 7.9 定时备份失败排查

查看脚本日志：

```bash
sudo tail -n 200 /var/log/cnc-db-backup.log
```

查看系统 cron 日志：

```bash
sudo grep CRON /var/log/syslog | tail -n 100
```

检查脚本是否存在并可执行：

```bash
sudo ls -l /usr/local/bin/backup-cnc-db.sh
sudo /usr/local/bin/backup-cnc-db.sh
```

检查数据库账号文件：

```bash
sudo ls -l /opt/cnc-web-manage/deploy-info.txt
sudo cat /opt/cnc-web-manage/deploy-info.txt
```

检查备份目录权限：

```bash
sudo ls -ld /opt/cnc-web-manage/backups
```

常见原因：

- `deploy-info.txt` 不存在或数据库密码为空。
- `/usr/local/bin/backup-cnc-db.sh` 没有执行权限。
- `cron` 服务没有运行。
- 服务器磁盘空间不足。
- MariaDB/MySQL 服务没有运行。

检查磁盘空间：

```bash
df -h
```

检查数据库服务：

```bash
sudo systemctl status mariadb --no-pager
```

## 8. 恢复数据库

恢复数据库会覆盖当前数据库内容。恢复前务必确认备份文件日期，并先给当前数据库再做一次临时备份。

### 8.1 选择备份文件

查看已有备份：

```bash
sudo ls -lh /opt/cnc-web-manage/backups
```

设置要恢复的备份文件：

```bash
RESTORE_FILE="/opt/cnc-web-manage/backups/cnc_manage-YYYY-MM-DD-HHMMSS.sql.gz"
```

校验备份文件：

```bash
sudo gzip -t "$RESTORE_FILE"
sudo sha256sum -c "${RESTORE_FILE}.sha256"
```

### 8.2 恢复前备份当前数据库

```bash
sudo /usr/local/bin/backup-cnc-db.sh
```

### 8.3 停止应用

```bash
sudo systemctl stop cnc-web-manage
```

### 8.4 读取数据库账号

```bash
DB_NAME="$(sudo awk -F': ' '/MySQL database/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_USER="$(sudo awk -F': ' '/MySQL user/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_PASS="$(sudo awk -F': ' '/MySQL password/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_HOST="$(sudo awk -F': ' '/MySQL host/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_PORT="$(sudo awk -F': ' '/MySQL port/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
```

### 8.5 解压备份

```bash
sudo gunzip -c "$RESTORE_FILE" > /tmp/cnc_restore.sql
sudo ls -lh /tmp/cnc_restore.sql
```

### 8.6 执行恢复

```bash
MYSQL_PWD="$DB_PASS" mysql \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  "$DB_NAME" < /tmp/cnc_restore.sql
```

### 8.7 应用迁移并启动服务

```bash
cd /opt/cnc-web-manage
npx prisma migrate deploy
npx prisma generate
sudo systemctl start cnc-web-manage
sudo systemctl status cnc-web-manage --no-pager
```

### 8.8 恢复后检查

登录系统检查：

- 刀具列表是否正常。
- 工厂在用刀具是否正常。
- 维修记录是否正常。
- 盘点记录是否正常。
- 最新新增的数据是否符合恢复时间点。

也可以在服务器快速检查表数量：

```bash
MYSQL_PWD="$DB_PASS" mysql \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  "$DB_NAME" \
  -e "SELECT COUNT(*) AS tools FROM tools; SELECT COUNT(*) AS maintenance_records FROM maintenance_records; SELECT COUNT(*) AS transactions FROM tool_transactions;"
```

## 9. 迁移到新服务器

### 9.1 旧服务器生成备份

```bash
sudo /usr/local/bin/backup-cnc-db.sh
sudo ls -lh /opt/cnc-web-manage/backups
```

记录最新备份文件：

```bash
LATEST_BACKUP="$(sudo ls -t /opt/cnc-web-manage/backups/*.sql.gz | head -n 1)"
echo "$LATEST_BACKUP"
```

### 9.2 传到新服务器

```bash
scp "$LATEST_BACKUP" root@新服务器IP:/tmp/
scp "${LATEST_BACKUP}.sha256" root@新服务器IP:/tmp/
```

### 9.3 新服务器部署系统

```bash
curl -fsSL https://raw.githubusercontent.com/xiaoxya/cnc-web-manage/main/deploy.sh | sudo bash
```

### 9.4 新服务器恢复数据库

```bash
sudo systemctl stop cnc-web-manage

RESTORE_FILE="/tmp/cnc_manage-YYYY-MM-DD-HHMMSS.sql.gz"
sudo gzip -t "$RESTORE_FILE"

DB_NAME="$(sudo awk -F': ' '/MySQL database/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_USER="$(sudo awk -F': ' '/MySQL user/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_PASS="$(sudo awk -F': ' '/MySQL password/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_HOST="$(sudo awk -F': ' '/MySQL host/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_PORT="$(sudo awk -F': ' '/MySQL port/ {print $2}' /opt/cnc-web-manage/deploy-info.txt)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

sudo gunzip -c "$RESTORE_FILE" > /tmp/cnc_restore.sql

MYSQL_PWD="$DB_PASS" mysql \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  "$DB_NAME" < /tmp/cnc_restore.sql

cd /opt/cnc-web-manage
npx prisma migrate deploy
npx prisma generate
sudo systemctl start cnc-web-manage
```

### 9.5 新服务器检查

```bash
sudo systemctl status cnc-web-manage --no-pager
sudo systemctl status nginx --no-pager
sudo tail -n 100 /var/log/cnc-db-backup.log
```

登录系统检查刀具、维修、工厂在用、盘点数据是否完整。

## 10. 备份注意事项

- 每次系统升级前先备份数据库。
- 每次大批量导入、批量出库、批量盘点前建议先备份。
- 至少保留最近 30 天备份。
- 建议定期把备份文件复制到另一台电脑或云盘。
- 恢复数据库前确认备份文件日期，不要误恢复旧数据。
- 恢复完成后登录系统检查刀具列表、维修记录、盘点记录是否正常。
