import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { Sprout } from "lucide-react";
import { t } from "@/lib/i18n";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Sprout className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">{t.auth.loginTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
