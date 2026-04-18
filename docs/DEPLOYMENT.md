# TCG Ledger — Deployment Guide

Deploy to Raspberry Pi 5 at `192.168.1.20` (Tailnet `100.65.248.44`), reachable at `tcg.goonlabs`.

## Prerequisites

- Fedora workstation with Node.js 22+, npm, rsync
- Pi 5 running Docker (or Podman with docker-compose)
- SSH access to Pi as `melkor`
- Nginx Proxy Manager (NPM) running on the Pi
- Pi-hole for DNS

## One-Time Bootstrap

### 1. Create directories on the Pi

```bash
ssh melkor@192.168.1.20
sudo mkdir -p /opt/tcg-ledger /mnt/seagate/tcg-ledger-backups
sudo chown melkor:melkor /opt/tcg-ledger
```

### 2. Copy docker-compose.yml to the Pi

```bash
scp docker-compose.yml melkor@192.168.1.20:/opt/tcg-ledger/
```

### 3. Create .env on the Pi

```bash
ssh melkor@192.168.1.20
cat > /opt/tcg-ledger/.env << 'EOF'
POSTGRES_PASSWORD=<generate-a-strong-password>
AUTH_SECRET=<min-32-char-random-string>
APP_PORT=3001
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password
NODEMAILER_FROM=your-email@gmail.com
ADMIN_EMAIL=your-email@gmail.com
EOF
chmod 600 /opt/tcg-ledger/.env
```

### 4. Start Postgres

```bash
ssh melkor@192.168.1.20 "cd /opt/tcg-ledger && docker compose up -d postgres"
```

Wait for healthcheck: `docker compose ps` should show `healthy`.

### 5. Build and deploy from Fedora

```bash
make deploy
```

This builds Next.js on Fedora (faster than arm64 build on Pi), rsyncs the standalone output to the Pi, and restarts the app container.

### 6. Run migrations

```bash
make migrate
```

### 7. Start the app

```bash
make up
```

### 8. Create your admin account

```bash
make create-admin
```

Follow the interactive prompts for email, password, display name.

### 9. Configure Nginx Proxy Manager

In NPM (typically at `http://192.168.1.20:81`):

1. Add Proxy Host:
   - Domain: `tcg.goonlabs`
   - Forward Hostname: `127.0.0.1`
   - Forward Port: `3001` (or whatever `APP_PORT` is in `.env`)
   - Enable WebSockets Support
2. SSL tab:
   - Request new SSL certificate via Let's Encrypt
   - Force SSL: on

### 10. Configure Pi-hole DNS

Add to Pi-hole's custom DNS or `pihole.toml` hosts:

```
tcg.goonlabs 100.65.248.44
```

Use the Tailnet IP so it works both on LAN and over Tailscale (5G/mobile).

### 11. Add backup cron

```bash
ssh melkor@192.168.1.20
crontab -e
```

Add these two lines:

```cron
# Nightly backup at 04:00
0 4 * * * cd /opt/tcg-ledger && docker compose exec -T postgres pg_dump -U tcg tcg_ledger | gzip > /mnt/seagate/tcg-ledger-backups/tcg-$(date +\%Y\%m\%d).sql.gz
# Weekly cleanup of backups older than 30 days, Sundays at 05:00
0 5 * * 0 find /mnt/seagate/tcg-ledger-backups -name 'tcg-*.sql.gz' -mtime +30 -delete
```

## Day-to-Day Operations

| Task                | Command                                       |
| ------------------- | --------------------------------------------- |
| Check status        | `make status`                                 |
| View app logs       | `make logs`                                   |
| View DB logs        | `make logs-db`                                |
| Restart everything  | `make restart`                                |
| Deploy code changes | `make deploy`                                 |
| Run new migrations  | `make migrate`                                |
| Open DB shell       | `make db-shell`                               |
| Backup database     | `make db-backup`                              |
| Restore from backup | `make db-restore FILE=/path/to/backup.sql.gz` |
| Create a new user   | `make create-user`                            |
| Reset a password    | `make reset-password`                         |

## Troubleshooting

### App won't start

```bash
make logs    # Check for startup errors
make status  # Is postgres healthy?
```

Common issues:

- `DATABASE_URL` mismatch between `.env` and `docker-compose.yml`
- Postgres not healthy yet (wait for healthcheck)
- Missing `.env` file or wrong permissions

### Migration fails

```bash
make db-shell
\dt          -- List tables, check if schema is applied
```

If the DB is empty, run `make migrate` again. If it has tables but migration fails, check the migration SQL in `prisma/migrations/`.

### Can't reach tcg.goonlabs

1. Check Pi-hole DNS: does `nslookup tcg.goonlabs` resolve to `100.65.248.44`?
2. Check NPM: is the proxy host configured and SSL valid?
3. Check Tailscale: `tailscale status` on both machines
4. Check app is running: `make status` should show both containers `Up`
5. Check port binding: `ssh melkor@pi "curl -sf http://localhost:3001/admin/login"` should return HTML

### Backup verification

```bash
# List backups
ssh melkor@192.168.1.20 "ls -lh /mnt/seagate/tcg-ledger-backups/"

# Test restore to a temp DB
ssh melkor@192.168.1.20 "cd /opt/tcg-ledger && docker compose exec -T postgres createdb -U tcg tcg_restore_test"
make db-restore FILE=/mnt/seagate/tcg-ledger-backups/tcg-20260417.sql.gz
# Verify, then drop:
ssh melkor@192.168.1.20 "cd /opt/tcg-ledger && docker compose exec -T postgres dropdb -U tcg tcg_restore_test"
```

## After Successful Deploy

Merge to main and tag:

```bash
git checkout main
git merge --no-ff pivot/personal-tracker
git tag v0.1.0-pivot
git push origin main --tags
```
