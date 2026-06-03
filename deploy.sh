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
DEPLOY_INFO_FILE="${DEPLOY_INFO_FILE:-}"
DEPLOY_DOC_FILE="${DEPLOY_DOC_FILE:-}"

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

parse_mysql_url() {
  local url="$1"
  local without_scheme="${url#mysql://}"
  DB_USER="${without_scheme%%:*}"
  local rest="${without_scheme#*:}"
  DB_PASS="${rest%%@*}"
  local host_and_db="${rest#*@}"
  DB_HOST="${host_and_db%%:*}"
  local port_and_db="${host_and_db#*:}"
  DB_PORT="${port_and_db%%/*}"
  DB_NAME="${port_and_db#*/}"
}

write_deploy_info() {
  local info_file="${DEPLOY_INFO_FILE:-$APP_DIR/deploy-info.txt}"
  local doc_file="${DEPLOY_DOC_FILE:-$APP_DIR/deploy-info.md}"

  cat > "$info_file" <<EOF
App directory: ${APP_DIR}
MySQL user: ${DB_USER}
MySQL password: ${DB_PASS}
Database name: ${DB_NAME}
Database host: ${DB_HOST}
Database port: ${DB_PORT}
Environment file: ${APP_DIR}/.env
EOF
  chmod 600 "$info_file"

  cat > "$doc_file" <<EOF
# Deployment Notes

## Environment

- App directory: \`${APP_DIR}\`
- MySQL user: \`${DB_USER}\`
- MySQL password: \`${DB_PASS}\`
- Database name: \`${DB_NAME}\`
- Database host: \`${DB_HOST}\`
- Database port: \`${DB_PORT}\`
- Environment file: \`${APP_DIR}/.env\`

## Migration

```bash
cd ${APP_DIR}
npm ci --include=dev
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma db seed
npm run build
npm prune --omit=dev
sudo systemctl restart ${APP_NAME}
```

## Backup

```bash
mysqldump -u ${DB_USER} -p ${DB_NAME} > ${APP_DIR}/backup-\$(date +%F-%H%M%S).sql
```

## Restore

```bash
mysql -u ${DB_USER} -p ${DB_NAME} < /path/to/backup.sql
```

## Rollback

Prisma migrations do not auto-rollback in production. If you need to revert:

1. Restore a database backup.
2. Re-deploy a known good git commit.
3. Re-run:

```bash
cd ${APP_DIR}
npm ci --include=dev
npx prisma generate
npx prisma migrate deploy
npm run build
npm prune --omit=dev
sudo systemctl restart ${APP_NAME}
```
EOF
  chmod 600 "$doc_file"
}

mysql_exec() {
  local client=""

  if command -v mariadb >/dev/null 2>&1; then
    client="mariadb"
  elif command -v mysql >/dev/null 2>&1; then
    client="mysql"
  else
    return 1
  fi

  timeout 20s "$client" \
    --protocol=socket \
    --user=root \
    --connect-timeout=10 \
    "$@"
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
    if ! git -C "$APP_DIR" fetch origin "$BRANCH"; then
      fail "Failed to fetch latest code from origin/$BRANCH"
    fi
    if ! git -C "$APP_DIR" reset --hard FETCH_HEAD; then
      fail "Failed to reset working tree to FETCH_HEAD"
    fi
  else
    info "Cloning repository to $APP_DIR"
    rm -rf "$APP_DIR"
    if ! git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"; then
      fail "Failed to clone repository from $REPO_URL"
    fi
  fi

  info "Repository ready at $(git -C "$APP_DIR" rev-parse --short HEAD)"
}

setup_env() {
  step "Configuring environment"
  cd "$APP_DIR"
  DEPLOY_INFO_FILE="${DEPLOY_INFO_FILE:-$APP_DIR/deploy-info.txt}"

  if [[ ! -f .env ]]; then
    DB_PASS="$(gen_secret)"
    JWT_SECRET="$(gen_secret)"

    info "Creating database and application user"
    if ! mysql_exec -e "SELECT 1" >/dev/null 2>&1; then
      fail "Cannot connect to MariaDB as root over the local socket. Please verify the mariadb service is running and root socket auth works."
    fi

    if ! mysql_exec >/dev/null 2>&1 <<SQL
DROP USER IF EXISTS '${DB_USER}'@'localhost';
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
    then
      fail "Failed to initialize the database or application user. Check MariaDB logs and verify the root socket connection manually with: sudo mariadb"
    fi

    cat > .env <<EOF
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV=production
PORT=${APP_PORT}
EOF
    write_deploy_info
    info "Generated new .env"
  else
    if grep -q '^DATABASE_URL=' .env; then
      DB_URL="$(grep '^DATABASE_URL=' .env | head -n1 | cut -d= -f2- | tr -d '"')"
      parse_mysql_url "$DB_URL"
    fi
    info "Using existing .env"
    write_deploy_info
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
  log "MySQL user:    $DB_USER"
  log "MySQL password:$DB_PASS"
  log "Database name: $DB_NAME"
  log "Info file:     ${DEPLOY_INFO_FILE:-$APP_DIR/deploy-info.txt}"
  log "Doc file:      ${DEPLOY_DOC_FILE:-$APP_DIR/deploy-info.md}"
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
