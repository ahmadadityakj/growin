"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signup, getInviteInfo } from "./actions";
import { t } from "@/lib/i18n";

export function SignupForm({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<{ email: string; ownerName: string | null } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) return;
    getInviteInfo(inviteToken).then((res) => {
      if (res.ok) setInvite({ email: res.email, ownerName: res.ownerName });
      else setInviteError(res.error);
    });
  }, [inviteToken]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== fd.get("confirmPassword")) {
      setLoading(false);
      setError(t.auth.passwordMismatch);
      return;
    }
    const res = await signup({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password,
      inviteToken,
    });
    if (!res.ok) {
      setLoading(false);
      setError(res.error);
      return;
    }
    const login = await signIn("credentials", {
      email: fd.get("email"),
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {invite && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Anda diundang oleh {invite.ownerName ?? "rekan Anda"} untuk bergabung ke workspace mereka.
          </p>
        )}
        {inviteError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{inviteError}</p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.auth.name}</Label>
            <Input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={invite?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.common.loading : t.auth.signup}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
