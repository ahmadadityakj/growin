import Link from "next/link";
import { Sprout, Search, MessageSquareText, Send, Repeat, KanbanSquare, ShieldCheck, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { leads, outreachMessages, researchResults } from "@/server/db/schema";
import { count, eq, isNull } from "drizzle-orm";
import { GrowthHero } from "@/components/illustrations/growth-hero";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Growin | Platform Marketing & Sales Automation by Kreava",
  description:
    "Cari prospek dengan AI, kirim outreach personal via email dan WhatsApp, follow-up otomatis, dan kelola pipeline penjualan dalam satu platform.",
};

const STEPS = [
  {
    icon: Search,
    title: "Riset pasar",
    desc: "Ketik target Anda, misalnya '50 sekolah swasta di Lombok'. AI mencari kandidat dari sumber publik, mengekstrak kontak, dan menghapus duplikat.",
  },
  {
    icon: MessageSquareText,
    title: "Review & enrich",
    desc: "Anda pilih hasil yang relevan, lengkapi nomor WhatsApp atau email yang belum ada, lalu verifikasi kontak secara manual.",
  },
  {
    icon: Send,
    title: "Outreach personal",
    desc: "AI menulis pesan yang menyebut detail spesifik bisnis mereka, bukan blast template. Anda approve dulu, baru pesan terkirim via email atau WhatsApp.",
  },
  {
    icon: Repeat,
    title: "Follow-up otomatis",
    desc: "Sequence follow-up terjadwal berjalan sendiri dan berhenti otomatis saat lead membalas atau opt-out.",
  },
];

const FEATURES = [
  { icon: KanbanSquare, title: "Pipeline & nilai deal", desc: "Kanban Qualified sampai Won dengan estimasi nilai Rp/bulan per lead." },
  { icon: ShieldCheck, title: "Compliance bawaan", desc: "Cek unsubscribe sebelum kirim, halaman opt-out publik, approval gate sebelum pesan keluar." },
  { icon: Search, title: "Multi-provider riset", desc: "Tavily atau Brave untuk pencarian, OpenAI untuk ekstraksi. Semua request tercatat." },
  { icon: Repeat, title: "Task Center AI", desc: "Instruksi bahasa natural: riset, generate pesan, scoring, query leads." },
];

const TIERS = [
  {
    name: "Starter",
    price: "Rp149rb",
    for: "Solopreneur yang mulai prospecting",
    features: ["500 leads", "1 produk", "200 riset AI / bulan", "1 channel outreach", "1 pengguna"],
    cta: "Coba Gratis",
    highlight: false,
  },
  {
    name: "Growth",
    price: "Rp349rb",
    for: "Bisnis yang serius membangun pipeline",
    features: [
      "5.000 leads",
      "Produk & kampanye tanpa batas",
      "2.000 riset AI / bulan",
      "Email + WhatsApp",
      "Follow-up sequence otomatis",
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
      "10.000 riset AI / bulan",
      "5 pengguna",
      "Semua fitur Growth",
      "Priority support",
    ],
    cta: "Coba Gratis",
    highlight: false,
  },
];

async function getLiveStats() {
  const [[l], [m], [r]] = await Promise.all([
    db.select({ c: count() }).from(leads).where(isNull(leads.deletedAt)),
    db.select({ c: count() }).from(outreachMessages).where(eq(outreachMessages.status, "sent")),
    db.select({ c: count() }).from(researchResults),
  ]);
  return {
    leads: l?.c ?? 0,
    sent: m?.c ?? 0,
    results: r?.c ?? 0,
  };
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
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Sprout className="h-4 w-4" />
            </span>
            Growin
            <span className="text-xs font-normal text-muted-foreground">by Kreava</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#cara-kerja" className="hover:text-foreground">Cara Kerja</a>
            <a href="#fitur" className="hover:text-foreground">Fitur</a>
            <a href="#harga" className="hover:text-foreground">Harga</a>
          </nav>
          <Button size="sm" render={<Link href={ctaHref}>{ctaLabel}</Link>} />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Cari prospek. Kirim pesan. Follow-up. Satu tempat.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Growin membantu Anda menemukan calon pelanggan dengan AI, mengirim outreach personal
            via email dan WhatsApp, dan mengelola pipeline penjualan sampai deal.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" render={<Link href={ctaHref}>{ctaLabel} <ArrowRight className="ml-1" /></Link>} />
            <Button size="lg" variant="outline" render={<a href="#cara-kerja">Lihat cara kerja</a>} />
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-2 shadow-lg">
          <GrowthHero className="w-full rounded-xl bg-emerald-600/40" />
        </div>
      </section>

      {/* Live stats, hanya tampil kalau ada data */}
      {showStats && (
        <section className="border-y bg-emerald-50/60">
          <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x px-4 py-6 text-center">
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
      <section id="cara-kerja" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cara kerjanya</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Alur yang sama yang dipakai tim sales sungguhan, sebagian diotomatisasi.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">Langkah {i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Yang ada di dalamnya</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <f.icon className="h-4 w-4" />
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
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-xl border p-6 ${
                t.highlight ? "border-emerald-600 shadow-md ring-1 ring-emerald-600" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t.name}</h3>
                {t.highlight && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Rekomendasi
                  </span>
                )}
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">{t.price}</span>
                <span className="text-sm text-muted-foreground">/bulan</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.for}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={t.highlight ? "default" : "outline"}
                render={<Link href={ctaHref}>{t.cta}</Link>}
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Kuota riset habis? Top-up Rp50rb per 500 riset. Harga peluncuran dan dapat berubah.
        </p>
      </section>

      {/* CTA akhir */}
      <section className="border-t bg-emerald-600">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Mulai bangun pipeline Anda hari ini
          </h2>
          <p className="mx-auto mt-2 max-w-md text-emerald-100">
            Riset pertama gratis. Tidak perlu kartu kredit.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-6 bg-white text-emerald-700 hover:bg-emerald-50"
            render={<Link href={ctaHref}>{ctaLabel} <ArrowRight className="ml-1" /></Link>}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white">
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
