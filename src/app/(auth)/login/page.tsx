import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Sprout } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/brand-panel";
import { t } from "@/lib/i18n";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />

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
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.auth.noAccount}{" "}
            <Link href="/signup" className="font-medium text-emerald-700 underline underline-offset-4">
              {t.auth.signup}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
