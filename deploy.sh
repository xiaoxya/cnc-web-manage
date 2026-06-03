#!/usr/bin/env bash
set -euo pipefail

APP_NAME="cnc-web-manage"
REPO_URL="${REPO_URL:-https://github.com/xiaoxya/cnc-web-manage.git}"
BRANCH="${BRANCH:-main}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-}"
NODE_MAJOR="${NODE_MAJOR:-20}"
DB_NAME="${DB_NAME:-cnc_manage}"
DB_USER="${DB_USER:-cnc_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

if command -v git >/dev/null 2>&1 && git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  APP_DIR="$SCRIPT_DIR"
else
  APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
fi

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-unknown}"
else
  OS_ID="unknown"
fi

if [[ ! "$OS_ID" =~ ^(ubuntu|debian|linuxmint)$ ]]; then
  echo "[ERROR] This script currently supports Debian/Ubuntu based systems only."
  exit 1
fi

log() { printf '%s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
info() { printf '[INFO] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; }
fail() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

gen_secret() {
  openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'
}

mysql_exec() {
  if command -v mysql >/dev/null 2>&1; then
    if mysql "$@"; then
      return 0
    fi
  fi

  if command -v mariadb >/dev/null 2>&1; then
    mariadb "$@"
    return $?
  fi

  return 1
}

install_packages() {
  step "Installing system packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y git curl ca-certificates gnupg openssl build-essential nginx mariadb-server
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    current_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "$current_major" -ge "$NODE_MAJOR" ]]; then
      info "Node.js $(node -v) already installed"
      return
    fi
    warn "Node.js version is too old, upgrading to ${NODE_MAJOR}.x"
  fi

  step "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
}

ensure_mariadb() {
  step "Starting MariaDB"
  systemctl enable --now mariadb
}

prepare_repo() {
  step "Preparing application directory"
  mkdir -p "$(dirname "$APP_DIR")"

  if [[ -d "$APP_DIR/.git" ]]; then
    info "Updating existing checkout at $APP_DIR"
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
  else
    info "Cloning repository to $APP_DIR"
    rm -rf "$APP_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
  fi
}

setup_env() {
  step "Configuring environment"
  cd "$APP_DIR"

  if [[ ! -f .env ]]; then
    DB_PASS="$(gen_secret)"
    JWT_SECRET="$(gen_secret)"

    info "Creating database and application user"
    mysql_exec -e "SELECT 1" >/dev/null 2>&1 || fail "MySQL/MariaDB root access is not available"
    mysql_exec >/dev/null 2>&1 <<SQL
DROP USER IF EXISTS '${DB_USER}'@'localhost';
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

    cat > .env <<EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV=production
PORT=${APP_PORT}
EOF
    info "Generated new .env"
  else
    info "Using existing .env"
  fi
}

install_dependencies() {
  step "Installing npm dependencies"
  npm ci --include=dev
}

run_prisma_tasks() {
  step "Generating Prisma client"
  npx prisma generate

  step "Running database migrations"
  npx prisma migrate deploy

  step "Seeding database"
  npx prisma db seed
}

build_app() {
  step "Building production bundle"
  npm run build

  step "Removing dev dependencies"
  npm prune --omit=dev
}

setup_service() {
  step "Configuring systemd service"

  NODE_BIN="$(command -v node)"
  cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=CNC Tool Management System
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${NODE_BIN} ${APP_DIR}/build/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now "${APP_NAME}"
  systemctl restart "${APP_NAME}"
}

setup_nginx() {
  step "Configuring nginx"

  if [[ -z "$DOMAIN" ]]; then
    SERVER_NAME="_"
  else
    SERVER_NAME="$DOMAIN"
  fi

  if [[ -f /etc/nginx/sites-available/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  if [[ -d /etc/nginx/sites-available ]]; then
    NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
    NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
  else
    NGINX_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"
    NGINX_LINK="$NGINX_CONF"
  fi

  cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 20M;
    proxy_read_timeout 120s;

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
}
EOF

  if [[ "$NGINX_CONF" != "$NGINX_LINK" ]]; then
    ln -sf "$NGINX_CONF" "$NGINX_LINK"
  fi

  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

open_firewall() {
  if command -v ufw >/dev/null 2>&1; then
    if ufw status | grep -q "Status: active"; then
      info "Allowing HTTP traffic in UFW"
      ufw allow 80/tcp >/dev/null
    fi
  fi
}

print_summary() {
  step "Deployment complete"
  log "App directory: $APP_DIR"
  log "Service name:  $APP_NAME"
  log "Port:          $APP_PORT"
  if [[ -n "$DOMAIN" ]]; then
    log "Domain:        $DOMAIN"
  else
    log "Domain:        (IP access)"
  fi
  log ""
  log "Useful commands:"
  log "  systemctl status ${APP_NAME} --no-pager"
  log "  journalctl -u ${APP_NAME} -f"
  log "  systemctl status nginx --no-pager"
  log ""
  log "Default accounts after seeding:"
  log "  admin / admin123"
  log "  operator / operator123"
}

main() {
  install_packages
  install_node
  ensure_mariadb
  prepare_repo
  setup_env
  install_dependencies
  run_prisma_tasks
  build_app
  setup_service
  setup_nginx
  open_firewall
  print_summary
}

main "$@"
