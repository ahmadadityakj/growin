"use client";

import { useState } from "react";
import { Copy, Check, UserMinus, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMember, revokeInvite, removeMember, leaveWorkspace } from "./actions";

export function InviteForm() {
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLink(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const res = await inviteMember(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLink(`${window.location.origin}/invite/${res.token}`);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input name="email" type="email" required placeholder="email@rekan.com" className="max-w-xs" />
        <Button type="submit" disabled={loading}>
          {loading ? "Membuat..." : "Buat undangan"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {link && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/50">
          <code className="flex-1 truncate text-xs text-emerald-900">{link}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}

export function MemberRow({
  member,
}: {
  member: { memberId: string; name: string | null; email: string | null };
}) {
  const [pending, setPending] = useState(false);
  return (
    <li className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{member.name ?? "-"}</p>
        <p className="text-xs text-muted-foreground">{member.email}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await removeMember(member.memberId);
        }}
        title="Keluarkan dari workspace"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function InviteRow({
  invite,
}: {
  invite: { id: string; email: string; expiresAt: Date };
}) {
  const [pending, setPending] = useState(false);
  return (
    <li className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{invite.email}</p>
        <p className="text-xs text-muted-foreground">
          Kedaluwarsa {new Date(invite.expiresAt).toLocaleDateString("id-ID")}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await revokeInvite(invite.id);
        }}
        title="Batalkan undangan"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function LeaveButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Keluar dari workspace ini? Anda tidak akan lagi melihat datanya.")) return;
        setPending(true);
        await leaveWorkspace();
      }}
    >
      <LogOut className="mr-2 h-4 w-4" /> Keluar dari workspace
    </Button>
  );
}
