<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI work

For any UI or visual work, first read `DESIGN.md` for the project's design
direction (identity, palette, typography, imagery). Then apply the antislop
skills in `.devin/skills/` as the filter: `antislop` (core) always, plus
`antislop-ui`, `antislop-copywriting`, `antislop-human`,
`antislop-layoutmobile`, or `antislop-code` when the task touches those areas.

## Deployment (pola arenaa/sekolaa/mutera)

- Dua proses PM2 via `ecosystem.config.js`: **growin** (web, `next start -p 3009 -H 127.0.0.1`) dan **growin-worker** (pg-boss worker, `tsx src/server/jobs/worker.ts` — wajib jalan untuk riset AI + pengiriman pesan terjadwal).
- Di-proxy nginx `growin.kreava.id` → `127.0.0.1:3009` (contoh vhost: `deploy/nginx-growin.conf`).
- Deploy via GitHub Actions `.github/workflows/deploy-production.yml`: job `verify-build` (lint → tsc → build → tar artifact) lalu `deploy-production` (extract ke `/var/www/growin/releases/<id>` → `.github/deploy-release.sh`).
- `deploy-release.sh`: flock, symlink `.env` shared, `npm ci --omit=dev`, `npm run db:migrate` (drizzle migrations, BUKAN db:push), switch `current` symlink atomik, PM2 restart kedua app, health check `GET /api/health` (cek `ok:true` + `.release-id` match), rollback otomatis, prune 3 release terakhir.
- Secrets/vars repo GitHub: `SERVER_SSH_KEY`, `SERVER_KNOWN_HOSTS` (secrets), `SERVER_HOST`, `SERVER_USER`, `GROWIN_HEALTH_HOST` (vars, isi `growin.kreava.id`). Konfigurasi environment `production` di repo settings.
- Provision awal server (sekali): `mkdir -p /var/www/growin/{releases,logs}` + `.env` production di `/var/www/growin/.env` + database `growin` di Postgres server + DNS `growin.kreava.id` → IP server + nginx vhost + certbot SSL.
- Health endpoint: `src/app/api/health/route.ts` — `select 1` DB + baca `.release-id`.
- Catatan: `tsx`, `drizzle-kit`, `dotenv` ada di **dependencies** (bukan devDependencies) — dibutuhkan worker & `db:migrate` di server setelah `npm ci --omit=dev`.
