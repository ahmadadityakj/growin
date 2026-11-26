"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "./actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await acceptInvite(token);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={onClick} disabled={loading}>
        {loading ? "Bergabung..." : "Gabung ke workspace"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
