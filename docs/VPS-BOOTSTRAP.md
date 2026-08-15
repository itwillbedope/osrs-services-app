# VPS Bootstrap

Target stack: Ubuntu LTS, Node 24, pnpm 11.7.0, MySQL 8, Nginx and PM2.

Run commands as a sudo-capable operator. Do not paste real secrets into shared logs or scripts.

## 1. System Packages

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git build-essential nginx mysql-server
```

## 2. Node 24 and pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version

sudo corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm --version
```

## 3. PM2

```bash
sudo npm install -g pm2
pm2 --version
```

Enable startup after the app has been started once:

```bash
pm2 startup systemd
pm2 save
```

Follow the exact command printed by `pm2 startup`; it contains host-specific paths.

## 4. Application User and Directories

```bash
sudo adduser --system --group --home /var/www/osrs-services osrsapp

sudo mkdir -p /var/www/osrs-services/current
sudo mkdir -p /var/lib/osrs-services/private/custom-build-attachments
sudo mkdir -p /var/log/osrs-services
sudo mkdir -p /var/backups/osrs-services
sudo mkdir -p /var/www/letsencrypt

sudo chown -R osrsapp:osrsapp /var/www/osrs-services
sudo chown -R osrsapp:osrsapp /var/lib/osrs-services
sudo chown -R osrsapp:osrsapp /var/log/osrs-services
sudo chown -R osrsapp:osrsapp /var/backups/osrs-services

sudo chmod 750 /var/www/osrs-services
sudo chmod 750 /var/lib/osrs-services/private
sudo chmod 700 /var/lib/osrs-services/private/custom-build-attachments
sudo chmod 750 /var/log/osrs-services
sudo chmod 700 /var/backups/osrs-services
```

## 5. MySQL 8

Use the local MySQL socket for administration. Do not place the MySQL root password in shell history or scripts.

```bash
sudo systemctl enable --now mysql
sudo mysql
```

Inside MySQL, use private values:

```sql
CREATE DATABASE osrs_services
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'osrs_app'@'127.0.0.1'
  IDENTIFIED BY '<private-strong-password>';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON osrs_services.* TO 'osrs_app'@'127.0.0.1';

FLUSH PRIVILEGES;
```

## 6. Application Source

```bash
sudo -iu osrsapp
cd /var/www/osrs-services/current
git clone https://github.com/Faizan279/osrs-services-app.git .
git fetch origin --prune
git checkout <approved-launch-commit-sha>
pnpm install --frozen-lockfile
```

Create the private server environment file from `deploy/.env.production.example`:

```bash
cp deploy/.env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production` privately and use real production values only on the server.

## 7. Nginx

```bash
sudo cp deploy/nginx/osrs-services.conf.example /etc/nginx/sites-available/osrs-services.conf
sudo editor /etc/nginx/sites-available/osrs-services.conf
sudo ln -s /etc/nginx/sites-available/osrs-services.conf /etc/nginx/sites-enabled/osrs-services.conf
sudo nginx -t
sudo systemctl reload nginx
```

Use `staging.osrsservices.com` first. Do not cut production DNS until staging is approved.

## 8. First Application Boot

```bash
sudo -iu osrsapp
cd /var/www/osrs-services/current
set -a
. ./.env.production
set +a
pnpm db:generate
pnpm build
pnpm production:check
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
```

Run database migration and seed only after the production database procedure has been reviewed.
