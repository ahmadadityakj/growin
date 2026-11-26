# Roadmap & Development Backlog

Pekerjaan yang disadari perlu dilakukan tapi belum diimplementasi. Urutkan per prioritas; hapus item yang sudah selesai.

## Keamanan (wajib sebelum production publik)

- **Verifikasi signature webhook** — `src/app/api/webhooks/*`:
  - Fonnte: verifikasi token/signature callback
  - Resend: verifikasi `svix` signature (`webhookSecret` field sudah ada di PROVIDER_FIELDS)
  - WhatsApp Business: verifikasi `X-Hub-Signature-256` dengan Meta app secret (field `verifyToken` sudah ada; perlu tambah `appSecret`)
  - Dampak kalau dibiarkan: endpoint publik bisa dipalsukan siapa pun — penyerang bisa injeksi status pesan palsu, balasan palsu ke `messageReplies`, ubah status lead ke `replied`, menghentikan follow-up sequence, dan inject `unsubscribeRecords` untuk opt-out paksa lead mana pun.
- **Rate limit + verifikasi email pada `/signup`** — saat ini terbuka untuk spam signup.
- **Captcha/anti-bot pada signup** (bisa digabung dengan item di atas).

## Multi-tenancy & team

- Owner-check pada operasi minor yang belum (mis. `addContact`/`deleteContact` by ID — saat ini mengandalkan unguessable uuid).
- Role member bertingkat (mis. member read-only vs member full) — kolom `role` di `team_members` sudah siap.
- Sembunyikan tombol delete/export di UI untuk member (saat ini baru diblokir di server, error saat klik).

## Billing

- Halaman upgrade/checkout — tombol Upgrade saat ini hanya mengarah ke section harga di landing.
- Enforcement limit per-plan (sekarang baru trial; pro/belum dibatasi).
- Billing cycle & invoice.

## Fitur

- Ubah password di Settings (belum ada; password hanya bisa diubah langsung di DB).
- Email verification flow.
- Password reset/forgot password.

## Deploy

- Setup deploy ke VPS (`167.71.193.23`): pull repo + `drizzle-kit migrate` + env production.
