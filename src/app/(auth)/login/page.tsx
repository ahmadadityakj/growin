import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { Sprout, Search, MessageSquareText, TrendingUp } from "lucide-react";
import { GrowthHero } from "@/components/illustrations/growth-hero";
import { t } from "@/lib/i18n";

const FEATURES = [
  { icon: Search, text: "Riset pasar otomatis berbasis AI" },
  { icon: MessageSquareText, text: "Outreach email & WhatsApp terpersonalisasi" },
  { icon: TrendingUp, text: "Follow-up otomatis sampai lead convert" },
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel kiri: branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.1) 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">{t.app.name}</div>
            <div className="text-xs text-emerald-100">by Kreava</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
            Tumbuhkan bisnis dengan AI marketing agent
          </h1>
          <p className="mt-3 max-w-sm text-emerald-100">
            Satu platform untuk riset prospek, outreach, dan follow-up. Semua produk Kreava dalam satu tempat.
          </p>
          <GrowthHero className="mx-auto mt-6 w-full max-w-md" />
          <ul className="mt-4 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-emerald-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-3.5 w-3.5" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-200">
          © {new Date().getFullYear()} Kreava · Growin
        </p>
      </div>

      {/* Panel kanan: form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sprout className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.loginTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
