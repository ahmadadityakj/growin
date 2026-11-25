import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { SignupForm } from "./signup-form";
import { AuthBrandPanel } from "@/components/auth/brand-panel";
import { t } from "@/lib/i18n";

export const metadata = { title: "Daftar | Growin" };

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sprout className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.signupTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.signupSubtitle}</p>
          <div className="mt-6">
            <SignupForm />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="font-medium text-emerald-700 underline underline-offset-4">
              {t.auth.login}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
