# TCG Ledger — Build / Deploy / Manage
# Pi target: 192.168.1.20 (Tailnet: 100.65.248.44)
# Install root: /opt/tcg-ledger/
#
# Two environments:
#   prod  → /opt/tcg-ledger/app/     port 3001  DB: tcg_ledger       ← deploy from main
#   test  → /opt/tcg-ledger/app-test/ port 3002  DB: tcg_ledger_test  ← deploy from any branch

PI_HOST ?= 192.168.1.20
PI_USER ?= melkor
PI_DIR  ?= /opt/tcg-ledger
BACKUP_DIR ?= /mnt/seagate/tcg-ledger-backups

BUILD_ENV = DATABASE_URL="postgres://fake:fake@localhost:5432/fake" AUTH_SECRET="build-time-placeholder-min-32-chars-long"

# ─── Local Development ───────────────────────────────────────────────

.PHONY: dev test typecheck build lint

dev:
	npm run dev

test:
	npx vitest run

typecheck:
	npm run typecheck

lint:
	npm run lint

build:
	$(BUILD_ENV) npm run build

# ─── Deploy (prod — from main only) ─────────────────────────────────

.PHONY: deploy deploy-prod

deploy: deploy-prod

deploy-prod: build
	@echo "==> Deploying to PROD (app, port 3001)..."
	rsync -avz --delete .next/standalone/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app/
	rsync -avz --delete .next/static/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app/.next/static/
	rsync -avz --delete public/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app/public/
	rsync -avz prisma/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app/prisma/
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose restart app"
	@echo "==> Prod deploy complete."

# ─── Deploy (test — from any branch) ────────────────────────────────

.PHONY: deploy-test test-up test-down test-logs test-status

deploy-test: build
	@echo "==> Deploying to TEST (app-test, port 3002)..."
	ssh $(PI_USER)@$(PI_HOST) "mkdir -p $(PI_DIR)/app-test"
	rsync -avz --delete .next/standalone/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app-test/
	rsync -avz --delete .next/static/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app-test/.next/static/
	rsync -avz --delete public/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app-test/public/
	rsync -avz prisma/ $(PI_USER)@$(PI_HOST):$(PI_DIR)/app-test/prisma/
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose --profile test up -d app-test"
	@echo "==> Test deploy complete. Access at http://$(PI_HOST):3002"

test-up:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose --profile test up -d app-test"

test-down:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose --profile test stop app-test"

test-logs:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose --profile test logs -f app-test"

test-status:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose --profile test ps"

# ─── Migrate ─────────────────────────────────────────────────────────

.PHONY: migrate migrate-test

migrate:
	@echo "==> Applying migrations to PROD DB (tcg_ledger)..."
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -T postgres psql -U tcg -d tcg_ledger -f /dev/stdin" < $$(ls -1d prisma/migrations/*/migration.sql | tail -1)

migrate-test:
	@echo "==> Applying migrations to TEST DB (tcg_ledger_test)..."
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -T postgres psql -U tcg -c 'CREATE DATABASE tcg_ledger_test OWNER tcg' 2>/dev/null || true"
	@for f in prisma/migrations/*/migration.sql; do \
		echo "  Applying $$f..."; \
		ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -T postgres psql -U tcg -d tcg_ledger_test" < "$$f" 2>/dev/null; \
	done
	@echo "==> Test DB migrations complete."

# ─── Database ────────────────────────────────────────────────────────

.PHONY: db-shell db-shell-test db-backup db-restore

db-shell:
	ssh -t $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec postgres psql -U tcg -d tcg_ledger"

db-shell-test:
	ssh -t $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec postgres psql -U tcg -d tcg_ledger_test"

db-backup:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -T postgres pg_dump -U tcg tcg_ledger | gzip > $(BACKUP_DIR)/tcg-$$(date +%Y%m%d-%H%M%S).sql.gz"
	@echo "==> Backup saved to $(BACKUP_DIR)/"

db-restore:
	@test -n "$(FILE)" || (echo "Usage: make db-restore FILE=path/to/backup.sql.gz" && exit 1)
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && gunzip -c $(FILE) | docker compose exec -T postgres psql -U tcg -d tcg_ledger"

# ─── Container Lifecycle ─────────────────────────────────────────────

.PHONY: up down restart status logs logs-db

up:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose up -d"

down:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose down"

restart:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose restart"

status:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose ps -a"

logs:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose logs -f app"

logs-db:
	ssh $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose logs -f postgres"

# ─── User Management ────────────────────────────────────────────────

.PHONY: create-admin create-user reset-password

create-admin:
	ssh -t $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -it app npx tsx prisma/scripts/create-admin.ts"

create-user:
	ssh -t $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -it app npx tsx prisma/scripts/create-user.ts"

reset-password:
	ssh -t $(PI_USER)@$(PI_HOST) "cd $(PI_DIR) && docker compose exec -it app npx tsx prisma/scripts/reset-password.ts"
