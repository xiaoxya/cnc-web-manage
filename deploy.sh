#!/usr/bin/env bash
set -euo pipefail

#==============================================================================
# CNC 刀具管理系统 - 一键部署脚本
# 支持 Debian / Ubuntu / CentOS / RHEL / Rocky / AlmaLinux
#==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="cnc-web-manage"
APP_DIR="/opt/${APP_NAME}"
APP_PORT="${APP_PORT:-3000}"
NODE_VERSION="20"
REPO_URL="https://github.com/xiaoxya/cnc-web-manage.git"

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}==>${NC} ${BLUE}$1${NC}"; }

#==============================================================================
# 0. 检查运行权限
#==============================================================================
if [[ $EUID -ne 0 ]]; then
    log_error "此脚本需要 root 权限运行"
    echo "请使用: sudo bash $0"
    exit 1
fi

#==============================================================================
# 1. 检测操作系统
#==============================================================================
detect_os() {
    log_step "检测操作系统..."

    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
        OS_VERSION=$(cat /etc/debian_version)
    elif [[ -f /etc/redhat-release ]]; then
        OS="rhel"
        OS_VERSION=$(rpm -q --qf "%{VERSION}" $(rpm -q --whatprovides redhat-release) 2>/dev/null || echo "unknown")
    else
        log_error "无法检测操作系统类型"
        exit 1
    fi

    case "$OS" in
        ubuntu|debian|raspbian)
            PKG_MANAGER="apt-get"
            PKG_UPDATE="apt-get update -qq"
            OS_FAMILY="debian"
            ;;
        centos|rhel|rocky|almalinux|fedora|amzn)
            PKG_MANAGER="yum"
            PKG_UPDATE="yum makecache -q"
            command -v dnf &>/dev/null && { PKG_MANAGER="dnf"; PKG_UPDATE="dnf makecache -q"; }
            OS_FAMILY="rhel"
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            log_info "支持列表: Ubuntu, Debian, CentOS, RHEL, Rocky, AlmaLinux, Fedora"
            exit 1
            ;;
    esac

    log_info "检测到: $OS $OS_VERSION ($OS_FAMILY 系), 包管理器: $PKG_MANAGER"
}

#==============================================================================
# 2. 安装基础依赖
#==============================================================================
install_deps() {
    log_step "安装基础依赖 (curl, git, ca-certificates)..."
    $PKG_UPDATE
    if [[ $OS_FAMILY == "debian" ]]; then
        apt-get install -y -qq curl git ca-certificates gnupg 2>&1 | tail -1
    else
        $PKG_MANAGER install -y -q curl git ca-certificates 2>&1 | tail -1
    fi
    log_info "基础依赖安装完成"
}

#==============================================================================
# 3. 安装 Node.js
#==============================================================================
install_nodejs() {
    if command -v node &>/dev/null; then
        NODE_CURRENT=$(node -v | sed 's/v//' | cut -d. -f1)
        if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
            log_info "Node.js $(node -v) 已安装，跳过"
            return
        fi
        log_warn "Node.js 版本过低 ($(node -v))，将升级到 v${NODE_VERSION}.x"
    fi

    log_step "安装 Node.js ${NODE_VERSION}.x..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>&1 | tail -1
    apt-get install -y -qq nodejs 2>&1 | tail -1
    log_info "Node.js $(node -v) 安装完成"
}

install_nodejs_rhel() {
    if command -v node &>/dev/null; then
        NODE_CURRENT=$(node -v | sed 's/v//' | cut -d. -f1)
        if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
            log_info "Node.js $(node -v) 已安装，跳过"
            return
        fi
    fi

    log_step "安装 Node.js ${NODE_VERSION}.x..."
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>&1 | tail -1
    $PKG_MANAGER install -y -q nodejs 2>&1 | tail -1
    log_info "Node.js $(node -v) 安装完成"
}

#==============================================================================
# 4. 安装 MariaDB
#==============================================================================
install_mariadb() {
    if command -v mariadb &>/dev/null || command -v mysql &>/dev/null; then
        log_info "MariaDB/MySQL 已安装，跳过"
        return
    fi

    log_step "安装 MariaDB..."

    if [[ $OS_FAMILY == "debian" ]]; then
        apt-get install -y -qq mariadb-server 2>&1 | tail -1
        systemctl enable mariadb --now
        # wait for MariaDB to be ready
        for i in $(seq 1 30); do
            mysqladmin ping -u root 2>/dev/null && break
            sleep 1
        done
    else
        $PKG_MANAGER install -y -q mariadb-server 2>&1 | tail -1
        systemctl enable mariadb --now
        # wait for MariaDB to be ready
        for i in $(seq 1 30); do
            mysqladmin ping -u root 2>/dev/null && break
            sleep 1
        done
    fi

    log_info "MariaDB 安装完成"
}

#==============================================================================
# 5. 创建数据库
#==============================================================================
setup_database() {
    log_step "配置数据库..."

    # 生成随机密码
    DB_PASS=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '\n')
    DB_NAME="cnc_manage"
    DB_USER="cnc_user"
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '\n')

    # 检查数据库是否已存在
    if mysql -u root -e "USE ${DB_NAME};" 2>/dev/null; then
        log_warn "数据库 ${DB_NAME} 已存在，跳过创建"
        read -p "是否删除并重建？(y/N): " -r RECREATE
        if [[ $RECREATE =~ ^[Yy]$ ]]; then
            mysql -u root -e "DROP DATABASE IF EXISTS ${DB_NAME};"
            log_info "旧数据库已删除"
        else
            log_info "保留现有数据库"
            return
        fi
    fi

    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

    log_info "数据库创建完成"
    log_info "  数据库名: ${DB_NAME}"
    log_info "  用户名:   ${DB_USER}"
    log_info "  密码:     ${DB_PASS}"
}

#==============================================================================
# 6. 部署项目
#==============================================================================
deploy_app() {
    log_step "部署项目代码..."

    if [[ -d "$APP_DIR" ]]; then
        log_warn "目录 ${APP_DIR} 已存在"
        read -p "是否覆盖？(y/N): " -r OVERWRITE
        if [[ $OVERWRITE =~ ^[Yy]$ ]]; then
            rm -rf "$APP_DIR"
        else
            log_error "部署取消"
            exit 1
        fi
    fi

    git clone --depth=1 "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"

    log_step "安装 Node.js 依赖..."
    npm install --production 2>&1 | tail -3

    # 生成 .env
    log_step "生成配置文件..."
    cat > .env <<ENVEOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV=production
PORT=${APP_PORT}
ENVEOF
    log_info ".env 已生成"

    # 初始化数据库
    log_step "执行数据库迁移..."
    npx prisma migrate deploy 2>&1 | tail -3
    log_step "导入种子数据..."
    npx prisma db seed 2>&1 | tail -3

    # 构建
    log_step "构建生产版本..."
    npm run build 2>&1 | tail -3

    log_info "项目构建完成"
}

#==============================================================================
# 7. 配置 PM2
#==============================================================================
setup_pm2() {
    log_step "配置 PM2 进程守护..."

    if ! command -v pm2 &>/dev/null; then
        npm install -g pm2
    fi

    # 停止旧进程（如果存在）

    # create log directory
    mkdir -p "${APP_DIR}/logs"
    pm2 delete "$APP_NAME" &>/dev/null || true

    # 启动
    pm2 start "$APP_DIR/build/index.js" \
        --name "$APP_NAME" \
        --max-memory-restart 512M \
        --env-file "$APP_DIR/.env" \
        --log "${APP_DIR}/logs/app.log" \
        --error "${APP_DIR}/logs/error.log"

    # 创建日志目录
    mkdir -p "${APP_DIR}/logs"

    # 保存进程列表 + 开机自启
    pm2 save --force
    pm2 startup systemd -u root --hp /root 2>&1 | tail -1

    log_info "PM2 配置完成"
    log_info "常用命令:"
    log_info "  pm2 status             查看状态"
    log_info "  pm2 logs ${APP_NAME}    查看日志"
    log_info "  pm2 restart ${APP_NAME} 重启服务"
}

#==============================================================================
# 8. 配置 Nginx
#==============================================================================
setup_nginx() {
    log_step "配置 Nginx 反向代理..."

    read -p "请输入域名（无域名直接回车使用 IP）: " DOMAIN

    if [[ -z "$DOMAIN" ]]; then
        SERVER_NAME="_;"
        log_info "将使用 IP 访问"
    else
        SERVER_NAME="${DOMAIN};"
        log_info "域名: ${DOMAIN}"
    fi

    if ! command -v nginx &>/dev/null; then
        log_step "安装 Nginx..."
        if [[ $OS_FAMILY == "debian" ]]; then
            apt-get install -y -qq nginx 2>&1 | tail -1
        else
            $PKG_MANAGER install -y -q nginx 2>&1 | tail -1
        fi
    fi

    # Nginx 配置路径
    if [[ -d /etc/nginx/sites-available ]]; then
        NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
        NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
        NGINX_DEFAULT="/etc/nginx/sites-enabled/default"
        # 清理默认站点
        [[ -f "$NGINX_DEFAULT" ]] && rm -f "$NGINX_DEFAULT"
    else
        NGINX_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"
        NGINX_ENABLED="$NGINX_CONF"
    fi

    cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 20M;
    proxy_read_timeout 120s;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态资源缓存
    location /_app/immutable/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

    # Ubuntu/Debian 创建软链接
    if [[ "$NGINX_CONF" != "$NGINX_ENABLED" ]]; then
        ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    fi

    # 测试并重载
    if nginx -t 2>&1; then
        systemctl enable nginx --now
        systemctl reload nginx
        log_info "Nginx 配置完成"
    else
        log_error "Nginx 配置测试失败，请检查配置"
        return 1
    fi
}

#==============================================================================
# 9. 配置防火墙
#==============================================================================
setup_firewall() {
    log_step "配置防火墙..."

    if command -v ufw &>/dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw deny ${APP_PORT}/tcp
        ufw --force enable
        log_info "UFW 防火墙已配置"
    elif command -v firewall-cmd &>/dev/null; then
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_info "firewalld 防火墙已配置"
    else
        log_warn "未检测到防火墙，请手动配置"
    fi
}

#==============================================================================
# 10. 安装 SSL 证书（可选）
#==============================================================================
setup_ssl() {
    if [[ -z "${DOMAIN:-}" ]]; then
        log_info "未配置域名，跳过 SSL"
        return
    fi

    read -p "是否配置 Let's Encrypt SSL 证书？(y/N): " -r SSL
    if [[ ! $SSL =~ ^[Yy]$ ]]; then
        log_info "跳过 SSL"
        return
    fi

    log_step "安装 Certbot..."

    if [[ $OS_FAMILY == "debian" ]]; then
        apt-get install -y -qq certbot python3-certbot-nginx 2>&1 | tail -1
    else
        $PKG_MANAGER install -y -q certbot python3-certbot-nginx 2>&1 | tail -1
    fi

    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}"

    # 配置自动续期
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --nginx") | crontab -

    log_info "SSL 证书配置完成"
}

#==============================================================================
# 主流程
#==============================================================================
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║     CNC 刀具管理系统 - 一键部署脚本      ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"

    detect_os
    install_deps

    if [[ $OS_FAMILY == "debian" ]]; then
        install_nodejs
    else
        install_nodejs_rhel
    fi

    install_mariadb
    setup_database
    deploy_app
    setup_pm2
    setup_nginx
    setup_firewall
    setup_ssl

    #==========================================================================
    # 完成
    #==========================================================================
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         部署完成！                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  应用端口:   ${BLUE}${APP_PORT}${NC} (Nginx 反代至 80)"
    echo -e "  项目目录:   ${BLUE}${APP_DIR}${NC}"
    echo -e "  数据库名:   ${BLUE}${DB_NAME}${NC}"
    echo -e "  数据库用户: ${BLUE}${DB_USER}${NC}"
    echo ""
    echo -e "  ${YELLOW}默认管理员账号:${NC}"
    echo -e "    用户名: ${GREEN}admin${NC}"
    echo -e "    密码:   ${GREEN}admin123${NC}"
    echo ""
    echo -e "  ${YELLOW}管理命令:${NC}"
    echo -e "    pm2 status            查看服务状态"
    echo -e "    pm2 logs ${APP_NAME}   查看日志"
    echo -e "    pm2 restart ${APP_NAME} 重启服务"
    echo ""
}

main "$@"
