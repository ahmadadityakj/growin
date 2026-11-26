import Link from "next/link";
import {
  Sprout,
  Search,
  Import,
  MessageSquareText,
  Send,
  Repeat,
  Inbox,
  ShieldCheck,
  CalendarCheck2,
  BarChart3,
  Users,
  KeyRound,
  ArrowRight,
  Check,
} from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { leads, outreachMessages, researchResults } from "@/server/db/schema";
import { count, eq, isNull } from "drizzle-orm";
import { GrowthHero } from "@/components/illustrations/growth-hero";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Growin | Tempat Menjalankan Marketing B2B Anda, by Kreava",
  description:
    "Satu tempat untuk mengelola prospek, outreach WhatsApp & email, follow-up otomatis, dan pipeline penjualan. Leads dari impor, manual, atau riset AI.",
};

const STEPS = [
  {
    icon: Import,
    title: "Masukkan prospek",
    desc: "Dari mana saja: impor daftar yang sudah Anda punya, tambah manual, atau biar AI yang carikan. Misalnya '80 klinik kecantikan di Jabodetabek', lengkap dengan kontak dan tanpa duplikat.",
  },
  {
    icon: MessageSquareText,
    title: "Review & enrich",
    desc: "Anda pilih hasil yang relevan, lengkapi nomor WhatsApp atau email yang belum ada, lalu verifikasi kontak secara manual.",
  },
  {
    icon: Send,
    title: "Outreach personal",
    desc: "AI menulis pesan yang menyebut detail spesifik bisnis mereka, bukan blast template. Anda approve dulu, baru pesan terkirim dari nomor WA atau domain email Anda sendiri.",
  },
  {
    icon: Repeat,
    title: "Follow-up sampai deal",
    desc: "Sequence terjadwal berjalan sendiri dan berhenti saat lead membalas. Balasan masuk ke Inbox Anda, siap dibalas langsung dari aplikasi.",
  },
];

const FEATURES = [
  { icon: Inbox, title: "Inbox percakapan", desc: "Balasan leads masuk ke satu tempat, bukan hilang di chat pribadi. Lihat riwayat lengkap tiap lead dan balas langsung dari aplikasi lewat channel yang sama. Ada notifikasi email saat balasan baru datang." },
  { icon: ShieldCheck, title: "Proteksi nomor pengirim", desc: "Nomor Anda aset bisnis. Growin mengirim bertahap: warm-up mulai 15 pesan/hari, jeda acak antar kirim, tidak kirim malam, dan rem darurat otomatis saat banyak yang minta berhenti." },
  { icon: CalendarCheck2, title: "Agenda harian", desc: "Dashboard menampilkan yang harus dikerjakan hari ini: follow-up jatuh tempo, balasan baru masuk, dan leads qualified yang belum dihubungi." },
  { icon: BarChart3, title: "Laporan & nilai deal", desc: "Pipeline kanban dengan estimasi nilai deal, plus laporan revenue per sumber leads, per kampanye, dan per anggota tim. Anda tahu aktivitas mana yang benar-benar menghasilkan." },
  { icon: Users, title: "Kerja tim", desc: "Undang anggota tim, bagi leads per penanggung jawab, dan pantau performa masing-masing: pesan terkirim, balasan, sampai closing." },
  { icon: KeyRound, title: "Provider pilihan Anda", desc: "Pakai API key sendiri (OpenAI, Gemini, OpenRouter, DeepSeek, Groq) dengan fallback otomatis ke platform, atau pakai bawaan Growin. Channel kirim juga pilihan Anda: Fonnte, WA Business, Wablas, Twilio, Resend, atau SMTP." },
];

const TIERS = [
  {
    name: "Starter",
    price: "Rp149rb",
    for: "Solopreneur yang mulai prospecting",
    features: ["2.000 leads", "3 produk", "30 riset AI / bulan", "AI platform 500 operasi/bulan", "Semua channel outreach", "1 pengguna"],
    cta: "Coba Gratis",
    highlight: false,
  },
  {
    name: "Growth",
    price: "Rp349rb",
    for: "Bisnis yang serius membangun pipeline",
    features: [
      "10.000 leads",
      "10 produk",
      "150 riset AI / bulan",
      "AI platform 4.000 operasi/bulan",
      "Follow-up sequence otomatis",
      "3 anggota tim",
      "Pipeline & laporan",
    ],
    cta: "Coba Gratis",
    highlight: true,
  },
  {
    name: "Pro",
    price: "Rp799rb",
    for: "Agency dan tim sales kecil",
    features: [
      "Leads tanpa batas",
      "Produk tanpa batas",
      "500 riset AI / bulan",
      "AI platform 10.000 operasi/bulan",
      "10 anggota tim",
      "Semua fitur Growth",
      "Priority support",
    ],
    cta: "Coba Gratis",
    highlight: false,
  },
];

function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20 4C10 4 4 10 4 18c0 .8.1 1.4.3 2h.2C5.3 13 11 8.3 18.5 6.5 11 9.6 6.2 15.2 5.6 20H6c6 0 14-4 14-16Z" />
    </svg>
  );
}

async function getLiveStats() {
  const [[l], [m], [r]] = await Promise.all([
    db.select({ c: count() }).from(leads).where(isNull(leads.deletedAt)),
    db.select({ c: count() }).from(outreachMessages).where(eq(outreachMessages.status, "sent")),
    db.select({ c: count() }).from(researchResults),
  ]);
  return { leads: l?.c ?? 0, sent: m?.c ?? 0, results: r?.c ?? 0 };
}

export default async function LandingPage() {
  const [session, stats] = await Promise.all([auth(), getLiveStats()]);
  const loggedIn = !!session?.user;
  const ctaHref = loggedIn ? "/dashboard" : "/signup";
  const ctaLabel = loggedIn ? "Buka Dashboard" : "Coba Gratis";
  const showStats = stats.leads + stats.sent + stats.results > 0;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Sprout className="h-4 w-4" />
            </span>
            Growin
            <span className="text-xs font-normal text-muted-foreground">by Kreava</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#cara-kerja" className="transition-colors hover:text-emerald-700">Cara Kerja</a>
            <a href="#fitur" className="transition-colors hover:text-emerald-700">Fitur</a>
            <a href="#harga" className="transition-colors hover:text-emerald-700">Harga</a>
          </nav>
          <Button size="sm" className="shadow-sm" render={<Link href={ctaHref}>{ctaLabel}</Link>} />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60rem 30rem at 85% -10%, rgba(16,185,129,0.16) 0, transparent 60%), radial-gradient(50rem 28rem at -10% 40%, rgba(20,184,166,0.12) 0, transparent 55%)",
          }}
        />
        <LeafMark className="pointer-events-none absolute -left-8 top-24 h-40 w-40 rotate-12 text-emerald-100" />
        <LeafMark className="pointer-events-none absolute right-1/3 top-8 h-16 w-16 -rotate-45 text-emerald-100/70" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Cari prospek. Kirim pesan.{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Follow-up sampai deal.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Satu tempat untuk menjalankan marketing B2B setiap hari: kelola prospek, kirim
              outreach personal via WhatsApp dan email, follow-up otomatis, sampai deal.
              Leads bisa dari daftar yang sudah Anda punya, atau dicarikan AI.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="shadow-md shadow-emerald-600/20" render={<Link href={ctaHref}>{ctaLabel} <ArrowRight className="ml-1" /></Link>} />
              <Button size="lg" variant="outline" render={<a href="#cara-kerja">Lihat cara kerja</a>} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Trial 14 hari: 500 leads · 10 riset AI · 200 operasi AI. Pesan terkirim atas nama
              nomor/domain Anda sendiri (Fonnte, Resend, dsb). Tanpa kartu kredit.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-3 shadow-xl shadow-emerald-600/20">
              <div className="rounded-2xl bg-emerald-600/50">
                <GrowthHero className="w-full" />
              </div>
            </div>
            {/* Floating mini-cards: produk sedang bekerja */}
            <div className="absolute -left-4 top-8 hidden rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Search className="h-3 w-3" />
                </span>
                <div>
                  <div className="font-semibold">Riset selesai</div>
                  <div className="text-muted-foreground">48 prospek ditemukan</div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-10 hidden rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur sm:block">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <Inbox className="h-3 w-3" />
                </span>
                <div>
                  <div className="font-semibold">Balasan baru</div>
                  <div className="text-muted-foreground">PT Maju membalas WA Anda</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-3 bottom-16 hidden rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur md:block">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                  <Repeat className="h-3 w-3" />
                </span>
                <div>
                  <div className="font-semibold">Follow-up aktif</div>
                  <div className="text-muted-foreground">3 sequence berjalan</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats, hanya tampil kalau ada data */}
      {showStats && (
        <section className="border-y border-emerald-100 bg-emerald-50/60">
          <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-emerald-100 px-4 py-6 text-center">
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-800">{stats.results.toLocaleString("id-ID")}</div>
              <div className="text-xs text-emerald-900/70 sm:text-sm">prospek ditemukan riset</div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-800">{stats.leads.toLocaleString("id-ID")}</div>
              <div className="text-xs text-emerald-900/70 sm:text-sm">leads di CRM</div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-emerald-800">{stats.sent.toLocaleString("id-ID")}</div>
              <div className="text-xs text-emerald-900/70 sm:text-sm">pesan terkirim</div>
            </div>
          </div>
        </section>
      )}

      {/* Cara kerja */}
      <section id="cara-kerja" className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cara kerjanya</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Alur yang sama yang dipakai tim sales sungguhan, sebagian diotomatisasi.
        </p>
        <div className="relative mt-12">
          <div
            className="absolute left-0 right-0 top-5 hidden border-t-2 border-dashed border-emerald-200 lg:block"
            aria-hidden="true"
          />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25">
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Langkah {i + 1}</span>
                </div>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="relative overflow-hidden border-t border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-background">
        <LeafMark className="pointer-events-none absolute -right-10 -top-6 h-44 w-44 -rotate-12 text-emerald-100/60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Yang ada di dalamnya</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Semua yang dibutuhkan untuk prospecting sampai closing.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group flex gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25 transition-transform group-hover:scale-105">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Harga</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Satu deal saja biasanya sudah menutup biaya langganan.
        </p>
        <div className="mt-10 grid items-start gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow ${
                t.highlight
                  ? "border-emerald-500 shadow-xl shadow-emerald-600/15 md:-mt-4 md:mb-4"
                  : "hover:shadow-md"
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  Rekomendasi
                </div>
              )}
              <h3 className="font-semibold">{t.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">{t.price}</span>
                <span className="text-sm text-muted-foreground">/bulan</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.for}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.highlight ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-6 w-full ${t.highlight ? "shadow-md shadow-emerald-600/20" : ""}`}
                variant={t.highlight ? "default" : "outline"}
                render={<Link href={ctaHref}>{t.cta}</Link>}
              />
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
          <span className="font-semibold text-emerald-900">Semua akun mulai dari trial 14 hari. </span>
          <span className="text-muted-foreground">
            Yang Anda dapat selama trial: 500 leads, 1 produk, 10 riset AI (maks 50 prospek per riset),
            200 operasi AI platform, semua channel outreach, Inbox, follow-up, dan pipeline penuh.
            Pesan dikirim dari nomor WA/domain email Anda sendiri, bukan nomor Growin.
            Setelah 14 hari, data tetap tersimpan; upgrade untuk melanjutkan.
          </span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Pembayaran via transfer bank, konfirmasi diproses maks 1x24 jam kerja. Harga peluncuran dan dapat berubah.
        </p>
      </section>

      {/* CTA akhir */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.12) 0, transparent 40%)",
          }}
        />
        <LeafMark className="pointer-events-none absolute left-8 top-6 h-24 w-24 rotate-12 text-white/10" />
        <LeafMark className="pointer-events-none absolute bottom-4 right-16 h-32 w-32 -rotate-45 text-white/10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center text-white sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Mulai bangun pipeline Anda hari ini
          </h2>
          <p className="mx-auto mt-3 max-w-md text-emerald-100">
            Daftar gratis, jalankan riset pertama, dan lihat prospek masuk ke CRM Anda.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 bg-white text-emerald-700 shadow-lg hover:bg-emerald-50"
            render={<Link href={ctaHref}>{ctaLabel} <ArrowRight className="ml-1" /></Link>}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sprout className="h-3 w-3" />
            </span>
            Growin by Kreava
          </div>
          <div className="flex gap-5">
            <a href="#harga" className="hover:text-foreground">Harga</a>
            <Link href="/login" className="hover:text-foreground">Masuk</Link>
            <Link href="/unsubscribe" className="hover:text-foreground">Berhenti berlangganan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
