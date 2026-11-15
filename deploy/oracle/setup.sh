#!/usr/bin/env bash
# Install Node 20 + CYBER-CRYPT as a systemd service on Ubuntu (Oracle Always Free).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/yukota04/CYBER-CRYPT.git}"
APP_DIR="${APP_DIR:-/opt/cyber-crypt}"
BRANCH="${BRANCH:-main}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-run with sudo: sudo bash setup.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates build-essential

# Node 20
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
npm install --legacy-peer-deps
npm run build

id cybercrypt >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cybercrypt
chown -R cybercrypt:cybercrypt "$APP_DIR"

cat >/etc/systemd/system/cyber-crypt.service <<EOF
[Unit]
Description=CYBER-CRYPT game server
After=network.target

[Service]
Type=simple
User=cybercrypt
WorkingDirectory=$APP_DIR
EnvironmentFile=-/etc/cyber-crypt/env
ExecStart=/usr/bin/npx tsx server.ts
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /etc/cyber-crypt
if [[ ! -f /etc/cyber-crypt/env ]]; then
  cat >/etc/cyber-crypt/env <<'ENV'
NODE_ENV=production
PORT=3000
APP_URL=http://CHANGE_ME
# DATABASE_URL=postgresql://...
# CLOUD_SAVE_SECRET=change-me-and-keep-stable
ENV
  echo "Edit /etc/cyber-crypt/env then: systemctl restart cyber-crypt"
fi

systemctl daemon-reload
systemctl enable cyber-crypt
systemctl restart cyber-crypt
systemctl --no-pager --full status cyber-crypt || true
echo "Done. Open TCP 3000 (or put nginx on 80/443 in front)."
