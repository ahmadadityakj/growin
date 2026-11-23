# Growin

AI-powered marketing & sales automation platform oleh **Kreava** — satu platform, banyak produk, banyak kampanye, satu database lead terpusat.

## Stack

- **Next.js** (App Router) + TypeScript
- **PostgreSQL** + **Drizzle ORM**
- **Tailwind CSS** + **shadcn/ui**
- **Auth.js v5** (credentials)
- **OpenAI** (`gpt-4o-mini` untuk ekstraksi riset, `gpt-4.1-mini` untuk copywriting/scoring — configurable via env)
- **pg-boss** — background job queue di PostgreSQL (tanpa Redis)
- **Recharts** — analytics
- Integrasi: **Resend** (email), **Fonnte** (WhatsApp), **Brave/Tavily** (search API untuk riset pasar)

## Fitur

| Modul | Deskripsi |
|---|---|
| Dashboard | KPI leads, kampanye aktif, pesan, aktivitas terbaru |
| Produk | CRUD produk + AI knowledge context per produk |
| Kampanye | Target audiens/industri/lokasi/kuantitas/channel |
| AI Task Center | Instruksi bahasa natural → task terstruktur |
| Riset Pasar | Search provider (Brave/Tavily/OpenAI) → ekstraksi lead + source URL → review → masuk CRM |
| CRM Leads | Filter, tags, bulk actions, CSV import/export, scoring AI |
| Outreach | Generate pesan AI, template, approval gate, antrian kirim |
| Follow-ups | Sequence multi-step, auto-stop saat reply/opt-out, scheduler 15 menit |
| Reports | Metrik real dari database (bukan angka simulasi) |
| Integrations | Credential terenkripsi AES-256-GCM, test koneksi |
| Compliance | Unsubscribe page, suppression list, opt-out enforcement |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Salin env dan isi nilainya
cp .env.example .env
```

Isi minimal di `.env`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/growin"
AUTH_SECRET="..."                      # npx auth secret
SEED_ADMIN_EMAIL="admin@growin.local"
SEED_ADMIN_PASSWORD="admin123"
ENCRYPTION_KEY="..."                   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
# 3. Buat database (sekali)
#    psql -U postgres -c "CREATE DATABASE growin;"

# 4. Migrasi + seed
npm run db:generate   # generate migration dari schema (jika schema berubah)
npm run db:migrate    # apply migration
npm run db:seed       # admin user + produk Kreava awal

# 5. Jalankan app + worker (2 terminal)
npm run dev           # http://localhost:3000
npm run worker        # background jobs: riset, kirim pesan, follow-up tick
```

Login: `admin@growin.local` / `admin123` (ganti via env sebelum seed).

## Integrasi opsional

| Env | Fungsi | Tanpa key |
|---|---|---|
| `OPENAI_API_KEY` | riset ekstraksi, generate pesan, scoring | generate pesan pakai template fallback; riset gagal eksplisit |
| `BRAVE_SEARCH_API_KEY` / `TAVILY_API_KEY` | search untuk riset pasar (`SEARCH_PROVIDER=brave\|tavily\|openai`) | fallback ke OpenAI; tanpa semua → job riset error jelas |
| `RESEND_API_KEY` | kirim email | pesan tetap bisa dibuat & di-approve, kirim gagal eksplisit |
| `RESEND_WEBHOOK_SECRET` | verifikasi signature webhook `/api/webhooks/resend` | event diterima tanpa verifikasi (dev only) |
| `FONNTE_TOKEN` | kirim WhatsApp | sama — tidak ada simulasi kirim |

Credential juga bisa diisi via halaman **Integrations** di app (tersimpan terenkripsi, menimpa env).

## Webhooks

- `POST /api/webhooks/resend` — delivery/bounce/complaint → update status pesan
- `POST /api/webhooks/fonnte` — status terkirim + balasan masuk → `message_replies`
- `GET/POST /unsubscribe` — halaman opt-out publik

## Prinsip

- PostgreSQL = source of truth, semua akses via Drizzle.
- Tidak ada pesan "pura-pura terkirim" — `sent` hanya setelah konfirmasi provider.
- Approval gate: pesan massal `pending_approval` → `approved` → `queued` → worker kirim.
- Compliance: cek unsubscribe/opt-out di setiap pengiriman; follow-up auto-stop saat reply/opt-out.
- Riset tidak pernah mengarang data: tiap lead menyimpan `sourceUrl` + timestamp, dan harus di-review sebelum masuk CRM.
