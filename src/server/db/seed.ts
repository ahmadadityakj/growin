import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users, products } from "./schema";

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@growin.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

const seedProducts = [
  {
    name: "Arenaa",
    slug: "arenaa",
    description:
      "Platform booking dan manajemen venue olahraga (mini soccer, futsal, badminton, dll). Membantu pemilik venue mengelola jadwal, booking online, pembayaran, dan laporan.",
    websiteUrl: "https://arenaa.id",
    category: "Sports Venue Management",
    targetAudience: "Pemilik dan pengelola venue olahraga",
    targetIndustries: ["Olahraga & Rekreasi", "Hospitality"],
    targetLocations: ["Indonesia", "NTB", "Bali"],
    mainSellingPoints: [
      "Booking online 24/7 untuk pelanggan",
      "Manajemen jadwal multi-lapangan",
      "Pembayaran digital terintegrasi",
      "Laporan pendapatan real-time",
    ],
    keyFeatures: [
      "Kalender booking",
      "Manajemen lapangan",
      "Payment gateway",
      "Notifikasi WhatsApp",
      "Dashboard analytics",
    ],
    pricingInfo: "Subscription bulanan, hubungi untuk harga",
    status: "active" as const,
  },
  {
    name: "Sekolaa",
    slug: "sekolaa",
    description:
      "Platform manajemen sekolah dan produktivitas guru. Fitur administrasi sekolah, manajemen siswa, absensi, penilaian, generate soal dengan AI, dan komunikasi orang tua.",
    websiteUrl: "https://sekolaa.id",
    category: "Education Technology",
    targetAudience: "Sekolah swasta, yayasan pendidikan, kepala sekolah, guru",
    targetIndustries: ["Pendidikan"],
    targetLocations: ["Indonesia", "NTB", "Lombok"],
    mainSellingPoints: [
      "Generate soal otomatis dengan AI",
      "Administrasi sekolah terpusat",
      "Hemat waktu guru hingga 70%",
      "Komunikasi orang tua terintegrasi",
    ],
    keyFeatures: [
      "AI question generator",
      "Manajemen siswa & guru",
      "Absensi digital",
      "Penilaian & rapor",
      "Portal orang tua",
    ],
    pricingInfo: "Subscription per sekolah per tahun",
    status: "active" as const,
  },
  {
    name: "Rentaal",
    slug: "rentaal",
    description:
      "Platform manajemen bisnis rental (kendaraan, alat, properti). Kelola armada, booking, kontrak, pembayaran, dan perawatan dalam satu sistem.",
    websiteUrl: "https://rentaal.id",
    category: "Rental Business Management",
    targetAudience: "Pemilik bisnis rental mobil, motor, alat berat, dan properti",
    targetIndustries: ["Rental & Leasing", "Transportasi", "Pariwisata"],
    targetLocations: ["Indonesia", "Bali", "Lombok"],
    mainSellingPoints: [
      "Kontrol armada real-time",
      "Booking & kontrak digital",
      "Reminder jadwal perawatan",
      "Laporan okupansi & pendapatan",
    ],
    keyFeatures: [
      "Manajemen armada",
      "Booking calendar",
      "Kontrak digital",
      "Tracking pembayaran",
      "Maintenance reminder",
    ],
    pricingInfo: "Subscription bulanan per jumlah unit",
    status: "active" as const,
  },
  {
    name: "Mutera",
    slug: "mutera",
    description:
      "Aplikasi manajemen sales lapangan dan mobile sales. Tracking kunjungan sales, order taking, canvassing, dan monitoring tim lapangan dengan GPS.",
    websiteUrl: "https://mutera.id",
    category: "Sales Force Automation",
    targetAudience: "Distributor, perusahaan FMCG, tim sales lapangan",
    targetIndustries: ["Distribusi", "FMCG", "Retail"],
    targetLocations: ["Indonesia"],
    mainSellingPoints: [
      "Tracking sales real-time dengan GPS",
      "Order taking dari lapangan",
      "Rute kunjungan optimal",
      "Laporan performa tim otomatis",
    ],
    keyFeatures: [
      "GPS tracking",
      "Mobile order",
      "Manajemen rute",
      "Target & komisi",
      "Dashboard supervisor",
    ],
    pricingInfo: "Subscription per sales user per bulan",
    status: "active" as const,
  },
  {
    name: "Kreava Custom Software",
    slug: "kreava-custom",
    description:
      "Jasa pengembangan software custom oleh Kreava: aplikasi web, mobile app, sistem internal, integrasi API, dan digitalisasi proses bisnis.",
    websiteUrl: "https://kreava.id",
    category: "Software Development Services",
    targetAudience: "UKM, startup, dan perusahaan yang butuh sistem custom",
    targetIndustries: ["Semua industri"],
    targetLocations: ["Indonesia"],
    mainSellingPoints: [
      "Solusi sesuai kebutuhan bisnis",
      "Tim developer berpengalaman",
      "Support pasca-launch",
      "Harga kompetitif",
    ],
    keyFeatures: [
      "Web development",
      "Mobile app development",
      "System integration",
      "Maintenance & support",
    ],
    pricingInfo: "Project-based, mulai dari konsultasi gratis",
    status: "active" as const,
  },
];

async function seed() {
  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db
    .insert(users)
    .values({ email: ADMIN_EMAIL, name: "Admin", passwordHash, role: "admin" })
    .onConflictDoNothing({ target: users.email });
  console.log(`  ✓ ${ADMIN_EMAIL}`);

  console.log("Seeding products...");
  for (const p of seedProducts) {
    await db.insert(products).values(p).onConflictDoNothing({ target: products.slug });
    console.log(`  ✓ ${p.name}`);
  }

  console.log("Seed selesai.");
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
