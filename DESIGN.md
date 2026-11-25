# Growin — Design Direction

File ini adalah sumber arahan visual untuk semua kerja UI di project ini.
Baca bersama aturan antislop: file ini menentukan *soul*, antislop memfilter *slop*.

## Identity

Growin adalah platform marketing & sales automation milik Kreava.
Brand terasa: segar, tumbuh, hangat, profesional — bukan "AI SaaS template".
Nama "Growin" mengacu pada pertumbuhan; visual memakai motif tumbuh/naik
secara halus, bukan dekorasi literal.

## Personality

- Ramah tapi kompeten — target user adalah pemilik bisnis Indonesia, bukan developer
- Jelas dan jujur — tidak ada hype, tidak ada klaim tanpa data
- Rapi dan cepat — dashboard internal, bukan landing page marketing

## Language

- UI bahasa Indonesia (default), terstruktur untuk i18n
- Copy singkat, natural, tidak memakai em dash, tidak ada buzzword marketing
- Tanggal/angka mengikuti locale id-ID

## Palette

- **Base:** putih / netral terang (light mode adalah tema utama)
- **Core:** emerald + teal — identitas utama Growin
- **Accent:** satu warna aksen di momen kunci saja (amber untuk perhatian,
  rose/red hanya untuk destructive atau Lost)
- Gradasi emerald boleh dipakai untuk hero/panel login — sebagai fungsi
  hierarki, bukan default di semua permukaan
- Status colors: emerald=Won/success, blue=info/contacted, violet=interested,
  amber=negotiation/warning, red=lost/error, gray=neutral

## Typography

- **Font:** Plus Jakarta Sans (weights 400–800), dipakai untuk semua teks
  via `--font-sans` di `@theme`
- Heading: tracking ketat (tracking-tight), semibold–bold
- Angka/metrik: bold, hindari tabular gimmick

## Shape & Depth

- Radius: sudut membulat moderat (`rounded-lg`/`rounded-xl`), tidak semua pill
- Shadow: tipis, hanya untuk elemen yang benar-benar mengambang
  (dropdown, kartu kanban saat hover) — permukaan dasar tetap flat + border
- Border: halus, neutral

## Layout

- App shell: sidebar kiri + topbar, konten dalam `p-6` halaman
- Grid: kartu statistik `sm:grid-cols-3`/`4`, tabel untuk data padat
- Whitespace sebagai struktur; section tidak dipaksakan seragam
- Mobile harus berfungsi penuh (kanban → grid responsif, bukan overflow)

## Imagery

- Ilustrasi: SVG inline custom (sudah ada: growth-hero, dashboard-banner)
- Motif: grafik naik, daun/tumbuhan, chat bubble — relevan dengan produk
- Tidak memakai stok ilustrasi generik (undraw, storyset) atau 3D blob

## Motion

- Transisi halus saja (hover shadow, warna) — tidak ada floating/bounce
- Drag-and-drop kanban: feedback visual saat dragover (ring emerald)

## Data & Honesty

- Semua angka yang ditampilkan berasal dari database — tidak ada statistik contoh
- Empty state wajib ada dan informatif, tidak sekadar kotak kosong
- Fitur yang belum jadi: tidak ditampilkan di nav, atau dilabeli jelas
