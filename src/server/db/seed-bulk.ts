import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  users,
  products,
  leads,
  leadActivities,
  campaigns,
  campaignLeads,
  campaignChannels,
  outreachMessages,
  messageReplies,
  researchJobs,
  followupSequences,
  followupSteps,
  followupSchedules,
  aiGenerations,
  tags,
  leadTags,
} from "./schema";

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);
const id = () => crypto.randomUUID();

/* ---------- helpers ---------- */
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickW = <T>(pairs: readonly (readonly [T, number])[]): T => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    if ((r -= w) <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
};
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p: number) => Math.random() < p;
const daysAgo = (max: number, min = 0) =>
  new Date(Date.now() - randInt(min * 24 * 60, max * 24 * 60) * 60_000);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/* ---------- data pools ---------- */
const BIZ_PREFIX = ["CV", "PT", "UD", "Toko", "Klinik", "Apotek", "Bengkel", "Studio", "Agensi", "Hotel", "Resto", "Kafe", "Laundry", "Bimbel", "Dealer", "Kontraktor", "Percetakan", "Distributor", "Yayasan", "Koperasi"];
const BIZ_NAME = ["Makmur", "Sejahtera", "Berkah", "Nusantara", "Jaya", "Sentosa", "Prima", "Cahaya", "Sinar", "Mandiri", "Kencana", "Lestari", "Abadi", "Gemilang", "Wijaya", "Husada", "Medika", "Pelita", "Karya", "Utama", "Anugrah", "Bintang", "Samudra", "Terang", "Alam", "Buana", "Puspita", "Artha", "Duta", "Cipta", "Langgeng", "Mulia", "Raya", "Barokah"];
const BIZ_SUFFIX = ["", "", "", "Group", "Indonesia", "Bersaudara", "Mandiri", "Farma", "Kreatif", "Logistik"];
const CITIES: readonly (readonly [string, string])[] = [
  ["Jakarta Selatan", "DKI Jakarta"], ["Jakarta Timur", "DKI Jakarta"], ["Jakarta Barat", "DKI Jakarta"],
  ["Bandung", "Jawa Barat"], ["Bekasi", "Jawa Barat"], ["Bogor", "Jawa Barat"], ["Depok", "Jawa Barat"],
  ["Surabaya", "Jawa Timur"], ["Malang", "Jawa Timur"], ["Sidoarjo", "Jawa Timur"],
  ["Semarang", "Jawa Tengah"], ["Solo", "Jawa Tengah"], ["Yogyakarta", "DI Yogyakarta"],
  ["Medan", "Sumatera Utara"], ["Palembang", "Sumatera Selatan"], ["Pekanbaru", "Riau"],
  ["Makassar", "Sulawesi Selatan"], ["Denpasar", "Bali"], ["Balikpapan", "Kalimantan Timur"],
  ["Banjarmasin", "Kalimantan Selatan"], ["Pontianak", "Kalimantan Barat"], ["Mataram", "NTB"],
  ["Tangerang", "Banten"], ["Manado", "Sulawesi Utara"],
];
const INDUSTRIES = ["Kesehatan", "Pendidikan", "F&B", "Retail", "Otomotif", "Jasa Keuangan", "Konstruksi", "Pariwisata", "Teknologi", "Logistik", "Agrikultur", "Properti", "Kecantikan", "Fashion", "Event Organizer"];
const FIRST = ["Budi", "Siti", "Agus", "Dewi", "Rina", "Andi", "Sari", "Joko", "Maya", "Rudi", "Fitri", "Hendra", "Nur", "Dedi", "Ratna", "Eko", "Wulan", "Fajar", "Indah", "Yusuf", "Sri", "Bagus", "Putri", "Ahmad", "Lina", "Rizky", "Tina", "Wahyu", "Dian", "Galih"];
const LAST = ["Santoso", "Wijaya", "Pratama", "Saputra", "Kusuma", "Hidayat", "Nugroho", "Setiawan", "Rahmawati", "Permata", "Gunawan", "Maharani", "Firmansyah", "Lestari", "Anggraini", "Purnama", "Hakim", "Utami", "Ramadhan", "Kurniawan"];
const REPLY_TEXTS = [
  "Halo, boleh info lebih lanjut tentang produknya?",
  "Menarik, bisa kirim proposal ke email kami?",
  "Kapan bisa jadwalkan demo atau call singkat?",
  "Maaf, saat ini kami belum butuh. Terima kasih.",
  "Boleh tahu kisaran harganya dulu?",
  "Iya, kami lagi cari solusi seperti ini. Bisa lanjut WA?",
  "Wah kebetulan, kami baru bahas ini minggu lalu di tim.",
  "Mohon jangan hubungi lagi ya.",
  "Boleh, minggu depan saya ada waktu. Tolong atur jadwalnya.",
  "Ini nomor siapa ya? Kok tahu nomor saya?",
  "Bisa tolong kirimkan katalog/company profile-nya?",
  "Kami sudah pakai vendor lain, tapi boleh tahu bedanya apa?",
];
const MSG_BODIES_WA = [
  "Halo {name}, saya dari tim Growin. Kami bantu bisnis {industry} dapatkan leads B2B lewat outbound otomatis — boleh saya jelaskan singkat?",
  "Selamat siang {name}. Saya lihat {biz} aktif di {city} — kebetulan kami punya solusi yang cocok untuk bisnis {industry}. Ada waktu 10 menit?",
  "Halo {name}, izin memperkenalkan Growin — platform outreach B2B untuk bisnis seperti {biz}. Boleh kirim info singkatnya?",
];
const INSTRUCTIONS = [
  "klinik gigi dan klinik kecantikan di Jabodetabek",
  "distributor FMCG di Jawa Timur",
  "hotel dan villa di Bali yang punya website",
  "bengkel mobil resmi dan independen di Bandung",
  "sekolah swasta dan bimbel di Jabodetabek",
  "agen travel dan tour operator di Yogyakarta",
  "kafe dan resto dengan cabang di Surabaya",
  "kontraktor interior dan MEP di Jakarta",
];
const TAG_NAMES: readonly (readonly [string, string])[] = [
  ["Prioritas", "#10b981"], ["VIP", "#8b5cf6"], ["Follow-up panas", "#f59e0b"],
  ["Dari riset", "#3b82f6"], ["Klien lama", "#64748b"], ["Harga sensitif", "#ef4444"],
];
const LEAD_STATUS_W = [
  ["new", 30], ["researching", 3], ["qualified", 14], ["contacted", 18],
  ["replied", 8], ["interested", 7], ["follow_up", 6], ["negotiation", 5],
  ["converted", 5], ["not_interested", 3], ["invalid", 1],
] as const;
const MSG_STATUS_W = [
  ["sent", 42], ["delivered", 26], ["replied", 14], ["failed", 8],
  ["bounced", 4], ["queued", 3], ["approved", 2], ["pending_approval", 1],
] as const;
const ACTIVITY_TYPES: readonly (readonly [typeof leadActivities.$inferInsert.type, (n: string) => string])[] = [
  ["created", (n) => `Prospek ${n} ditambahkan`],
  ["status_change", (n) => `Status ${n} diubah`],
  ["message_sent", (n) => `Pesan outreach dikirim ke ${n}`],
  ["message_replied", (n) => `${n} membalas pesan`],
  ["research", (n) => `Riset AI menemukan ${n}`],
  ["score", (n) => `${n} diberi skor oleh AI`],
  ["follow_up", (n) => `Follow-up dijadwalkan untuk ${n}`],
];

async function seedBulk() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@growin.local";
  const [owner] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!owner) throw new Error(`User ${email} tidak ditemukan — jalankan db:seed dulu.`);
  const uid = owner.id;
  console.log(`Seed bulk untuk ${email} (${uid})`);

  /* ---- products (milik owner) ---- */
  let prods = await db.select().from(products).where(eq(products.ownerId, uid));
  if (prods.length === 0) {
    const rows = [
      { id: id(), ownerId: uid, name: "Growin Outreach", slug: `growin-outreach-${id().slice(0, 8)}`, description: "Paket outbound B2B dengan AI research + sequence WA/email.", category: "SaaS", targetAudience: "UKM & agensi B2B", status: "active" as const },
      { id: id(), ownerId: uid, name: "Jasa Dev Custom", slug: `jasa-dev-${id().slice(0, 8)}`, description: "Pengembangan software custom web & mobile oleh tim Kreava.", category: "Services", targetAudience: "UKM, startup, korporat", status: "active" as const },
      { id: id(), ownerId: uid, name: "Paket Setup + Training", slug: `paket-setup-${id().slice(0, 8)}`, description: "Setup Growin end-to-end + training tim sales.", category: "Services", targetAudience: "Tim sales 3–20 orang", status: "active" as const },
    ];
    prods = await db.insert(products).values(rows).returning();
    console.log(`  ✓ ${prods.length} produk dibuat`);
  }
  const prodIds = prods.map((p) => p.id);

  /* ---- leads ---- */
  const LEAD_N = 1500;
  console.log(`Membuat ${LEAD_N} leads...`);
  const leadRows: (typeof leads.$inferInsert & { id: string })[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < LEAD_N; i++) {
    let biz = "";
    do {
      biz = `${pick(BIZ_PREFIX)} ${pick(BIZ_NAME)}${chance(0.4) ? " " + pick(BIZ_SUFFIX) : ""}`;
    } while (usedNames.has(biz));
    usedNames.add(biz);
    const [city, province] = pick(CITIES);
    const status = pickW(LEAD_STATUS_W);
    const contacted = ["contacted", "replied", "interested", "follow_up", "negotiation", "converted", "not_interested"].includes(status);
    const hasEmail = chance(0.75);
    const hasWa = chance(0.7);
    leadRows.push({
      id: id(),
      businessName: biz,
      contactPerson: chance(0.85) ? `${pick(FIRST)} ${pick(LAST)}` : null,
      industry: pick(INDUSTRIES),
      businessType: pick(["B2B", "B2C", "B2B2C"]),
      email: hasEmail ? `${pick(["info", "halo", "sales", "contact"])}@${slug(biz)}.co.id` : null,
      phone: hasWa ? `6281${String(randInt(0, 9))}${String(randInt(10000000, 99999999))}` : null,
      whatsappNumber: hasWa ? `6281${String(randInt(0, 9))}${String(randInt(10000000, 99999999))}` : null,
      website: chance(0.55) ? `https://${slug(biz)}.id` : null,
      address: `Jl. ${pick(BIZ_NAME)} No. ${randInt(1, 200)}`,
      city,
      province,
      country: "Indonesia",
      source: pickW([["ai_research", 45], ["manual", 25], ["csv_import", 20], ["referral", 10]] as const),
      status,
      score: ["qualified", "replied", "interested", "negotiation", "converted"].includes(status) ? randInt(55, 98) : chance(0.4) ? randInt(20, 60) : null,
      dealValue: ["negotiation", "converted"].includes(status) ? randInt(2, 50) * 1_000_000 : null,
      lostReason: status === "not_interested" ? pick(["Sudah pakai kompetitor", "Budget belum ada", "Tidak relevan"]) : null,
      contactVerified: chance(0.35),
      lastContactedAt: contacted ? daysAgo(30) : null,
      nextFollowUpAt: status === "follow_up" ? new Date(Date.now() + randInt(0, 10) * 86_400_000) : null,
      ownerId: uid,
      assignedUserId: uid,
      createdAt: daysAgo(75),
      updatedAt: daysAgo(20),
    });
  }
  for (let i = 0; i < leadRows.length; i += 400) {
    await db.insert(leads).values(leadRows.slice(i, i + 400));
  }
  console.log(`  ✓ ${leadRows.length} leads`);

  /* ---- tags ---- */
  const tagIds: string[] = [];
  for (const [name, color] of TAG_NAMES) {
    const tid = id();
    await db.insert(tags).values({ id: tid, name, color, ownerId: uid }).onConflictDoNothing();
    tagIds.push(tid);
  }
  const ltRows = leadRows.filter(() => chance(0.25)).map((l) => ({ leadId: l.id, tagId: pick(tagIds) }));
  if (ltRows.length) await db.insert(leadTags).values(ltRows).onConflictDoNothing();
  console.log(`  ✓ ${TAG_NAMES.length} tags, ${ltRows.length} lead-tags`);

  /* ---- campaigns ---- */
  const campDefs = [
    ["Outbound Klinik & Kecantikan Jabotabek", "active", "Kesehatan", "Jabodetabek", 300],
    ["Penetrasi Distributor Jatim", "active", "F&B", "Jawa Timur", 250],
    ["Vendor Hotel & Villa Bali", "active", "Pariwisata", "Bali", 150],
    ["Sekolah & Bimbel Wave 1", "completed", "Pendidikan", "Jabodetabek", 200],
    ["Bengkel & Otomotif Bandung", "paused", "Otomotif", "Bandung", 120],
    ["Agen Travel Yogyakarta", "completed", "Pariwisata", "Yogyakarta", 80],
    ["Kontraktor Jakarta Pilot", "draft", "Konstruksi", "Jakarta", 100],
    ["Kafe & Resto Surabaya", "draft", "F&B", "Surabaya", 150],
  ] as const;
  const campRows: (typeof campaigns.$inferInsert & { id: string })[] = [];
  for (const [name, status, ind, loc, qty] of campDefs) {
    campRows.push({
      id: id(),
      name,
      productId: pick(prodIds),
      objective: "Dapatkan meeting/demo dengan decision maker",
      targetIndustry: ind,
      targetLocation: loc,
      targetLeadQty: qty,
      status,
      startDate: status !== "draft" ? daysAgo(60, 30) : null,
      endDate: status === "completed" ? daysAgo(10) : null,
      createdById: uid,
      createdAt: daysAgo(65, 30),
      updatedAt: daysAgo(15),
    });
  }
  await db.insert(campaigns).values(campRows);
  for (const c of campRows) {
    await db.insert(campaignChannels).values({ campaignId: c.id, channel: "whatsapp", isPrimary: true });
    if (chance(0.6)) await db.insert(campaignChannels).values({ campaignId: c.id, channel: "email" });
  }
  // assign leads ke campaign non-draft
  const clRows: typeof campaignLeads.$inferInsert[] = [];
  for (const c of campRows.filter((c) => c.status !== "draft")) {
    for (const l of leadRows) {
      if (chance(0.16)) {
        clRows.push({
          campaignId: c.id,
          leadId: l.id,
          status: pickW([["pending", 30], ["contacted", 30], ["replied", 15], ["interested", 10], ["converted", 8], ["not_interested", 7]] as const),
        });
      }
    }
  }
  for (let i = 0; i < clRows.length; i += 400) {
    await db.insert(campaignLeads).values(clRows.slice(i, i + 400)).onConflictDoNothing();
  }
  console.log(`  ✓ ${campRows.length} kampanye, ${clRows.length} campaign-leads`);

  /* ---- outreach messages ---- */
  const MSG_TARGET = 2400;
  const contactable = leadRows.filter((l) => (l.whatsappNumber || l.email) && l.status !== "new" && l.status !== "invalid");
  const msgRows: (typeof outreachMessages.$inferInsert & { id: string })[] = [];
  const leadById = new Map(leadRows.map((l) => [l.id, l]));
  const campByLead = new Map<string, string>();
  for (const cl of clRows) if (!campByLead.has(cl.leadId)) campByLead.set(cl.leadId, cl.campaignId);
  const now = Date.now();
  for (let i = 0; i < MSG_TARGET && contactable.length; i++) {
    const l = contactable[i % contactable.length];
    const channel = l.whatsappNumber ? (chance(0.7) || !l.email ? "whatsapp" : "email") : "email";
    const status = pickW(MSG_STATUS_W);
    // sebar sentAt: 55% dalam 7 hari terakhir biar chart mingguan terisi
    const sentAt = status !== "pending_approval" && status !== "approved" && status !== "queued"
      ? chance(0.55) ? daysAgo(7) : daysAgo(25, 8)
      : null;
    msgRows.push({
      id: id(),
      leadId: l.id,
      productId: pick(prodIds),
      campaignId: campByLead.get(l.id) ?? null,
      channel,
      recipient: channel === "whatsapp" ? l.whatsappNumber! : l.email!,
      subject: channel === "email" ? `Penawaran kerja sama untuk ${l.businessName}` : null,
      body: pick(MSG_BODIES_WA)
        .replace("{name}", l.contactPerson?.split(" ")[0] ?? "Bapak/Ibu")
        .replace("{biz}", l.businessName)
        .replace("{industry}", l.industry ?? "Anda")
        .replace("{city}", l.city ?? "kota Anda"),
      status,
      sentAt,
      deliveredAt: ["delivered", "replied"].includes(status) && sentAt ? new Date(sentAt.getTime() + randInt(1, 30) * 60_000) : null,
      error: status === "failed" ? pick(["nomor tidak terdaftar di WhatsApp", "gagal terkirim, coba lagi", "rate limit provider"]) : status === "bounced" ? "email bounced: mailbox tidak ditemukan" : null,
      providerMessageId: sentAt ? `wamid.${id().replace(/-/g, "").slice(0, 24)}` : null,
      createdById: uid,
      createdAt: sentAt ?? daysAgo(10),
      updatedAt: sentAt ?? daysAgo(10),
    });
  }
  for (let i = 0; i < msgRows.length; i += 400) {
    await db.insert(outreachMessages).values(msgRows.slice(i, i + 400));
  }
  console.log(`  ✓ ${msgRows.length} outreach messages`);

  /* ---- replies ---- */
  const repliedMsgs = msgRows.filter((m) => m.status === "replied");
  const replyRows: typeof messageReplies.$inferInsert[] = repliedMsgs.map((m) => {
    const l = leadById.get(m.leadId)!;
    return {
      messageId: m.id,
      leadId: m.leadId,
      channel: m.channel,
      sender: m.channel === "whatsapp" ? l.whatsappNumber : l.email,
      content: pick(REPLY_TEXTS),
      providerMessageId: `wamid.${id().replace(/-/g, "").slice(0, 24)}`,
      isRead: chance(0.75),
      receivedAt: m.sentAt ? new Date(m.sentAt.getTime() + randInt(30, 4000) * 60_000) : new Date(),
      createdAt: m.sentAt ? new Date(m.sentAt.getTime() + randInt(30, 4000) * 60_000) : new Date(),
    };
  });
  if (replyRows.length) {
    for (let i = 0; i < replyRows.length; i += 400) {
      await db.insert(messageReplies).values(replyRows.slice(i, i + 400));
    }
  }
  console.log(`  ✓ ${replyRows.length} balasan`);

  /* ---- lead activities ---- */
  const actRows: typeof leadActivities.$inferInsert[] = [];
  for (const l of leadRows) {
    const n = chance(0.55) ? randInt(1, 3) : 0;
    for (let i = 0; i < n; i++) {
      const [type, desc] = pick(ACTIVITY_TYPES);
      actRows.push({ leadId: l.id, type, description: desc(l.businessName), userId: uid, createdAt: daysAgo(40) });
    }
  }
  for (let i = 0; i < actRows.length; i += 400) {
    await db.insert(leadActivities).values(actRows.slice(i, i + 400));
  }
  console.log(`  ✓ ${actRows.length} aktivitas`);

  /* ---- research jobs ---- */
  const rjRows: typeof researchJobs.$inferInsert[] = INSTRUCTIONS.map((ins) => {
    const status = pickW([["completed", 55], ["needs_review", 20], ["failed", 10], ["pending", 10], ["processing", 5]] as const);
    const found = status === "completed" || status === "needs_review" ? randInt(15, 60) : 0;
    return {
      userId: uid,
      productId: pick(prodIds),
      campaignId: chance(0.5) ? pick(campRows).id : null,
      instruction: `Cari ${ins}`,
      targetQuantity: randInt(30, 100),
      targetIndustry: pick(INDUSTRIES),
      targetLocation: pick(CITIES)[0],
      status,
      provider: "openai",
      foundCount: found,
      approvedCount: status === "completed" ? Math.floor(found * 0.6) : 0,
      rejectedCount: status === "completed" ? Math.floor(found * 0.15) : 0,
      error: status === "failed" ? pick(["API timeout", "provider error 500", "quota tercapai"]) : null,
      startedAt: status !== "pending" ? daysAgo(30) : null,
      completedAt: ["completed", "failed"].includes(status) ? daysAgo(30) : null,
      createdById: uid,
      createdAt: daysAgo(40),
    };
  });
  await db.insert(researchJobs).values(rjRows);
  console.log(`  ✓ ${rjRows.length} research jobs`);

  /* ---- follow-up sequences + schedules ---- */
  const seqIds: string[] = [];
  for (const [name, channel] of [["Sequence WA Follow-up 3x", "whatsapp"], ["Sequence Email Nurture", "email"]] as const) {
    const sid = id();
    seqIds.push(sid);
    await db.insert(followupSequences).values({ id: sid, name, channel, ownerId: uid, campaignId: chance(0.5) ? pick(campRows).id : null, productId: pick(prodIds) });
    for (const [stepOrder, delayDays, instruction] of [[1, 2, "Ucapkan terima kasih + tanya apakah sudah sempat baca pesan sebelumnya"], [2, 4, "Kirim 1 studi kasus singkat yang relevan dengan industrinya"], [3, 7, "Tawarkan call 15 menit dengan 2 opsi jadwal"]] as const) {
      await db.insert(followupSteps).values({ sequenceId: sid, stepOrder, delayDays, instruction });
    }
  }
  const fuLeads = leadRows.filter((l) => ["contacted", "follow_up"].includes(l.status ?? ""));
  const schedRows: typeof followupSchedules.$inferInsert[] = fuLeads.slice(0, 120).map((l) => {
    const status = pickW([["active", 50], ["completed", 20], ["stopped_replied", 15], ["paused", 10], ["cancelled", 5]] as const);
    return {
      sequenceId: pick(seqIds),
      leadId: l.id,
      campaignId: campByLead.get(l.id) ?? null,
      currentStep: randInt(0, 3),
      status,
      nextRunAt: status === "active" ? new Date(now + randInt(0, 5) * 86_400_000) : null,
      startedAt: daysAgo(20),
      completedAt: ["completed", "stopped_replied", "cancelled"].includes(status) ? daysAgo(5) : null,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(5),
    };
  });
  if (schedRows.length) await db.insert(followupSchedules).values(schedRows);
  console.log(`  ✓ ${seqIds.length} sequence, ${schedRows.length} jadwal follow-up`);

  /* ---- ai generations (usage metering) ---- */
  const genRows: typeof aiGenerations.$inferInsert[] = [];
  for (let i = 0; i < 350; i++) {
    genRows.push({
      type: pickW([["message", 45], ["research_extract", 22], ["lead_score", 15], ["summary", 8], ["task_parse", 5], ["search_query", 5]] as const),
      model: pick(["gpt-4o-mini", "gpt-4.1-mini"]),
      tokensIn: randInt(200, 3000),
      tokensOut: randInt(50, 1200),
      leadId: chance(0.5) ? pick(leadRows).id : null,
      productId: chance(0.4) ? pick(prodIds) : null,
      campaignId: chance(0.35) ? pick(campRows).id : null,
      userId: uid,
      source: chance(0.7) ? "platform" : "workspace",
      createdAt: daysAgo(30),
    });
  }
  for (let i = 0; i < genRows.length; i += 400) {
    await db.insert(aiGenerations).values(genRows.slice(i, i + 400));
  }
  console.log(`  ✓ ${genRows.length} ai_generations`);

  console.log("\nSeed bulk selesai.");
  await sql.end();
}

seedBulk().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
