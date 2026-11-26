"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sendReply } from "./actions";

type Channel = "whatsapp" | "email";

export function ReplyComposer({
  leadId,
  channels,
  defaultChannel,
}: {
  leadId: string;
  channels: Channel[];
  defaultChannel: Channel;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (channels.length === 0) {
    return (
      <p className="border-t px-4 py-3 text-sm text-muted-foreground">
        Lead ini tidak punya email maupun nomor WhatsApp. Lengkapi kontaknya dulu di halaman lead.
      </p>
    );
  }

  const submit = () =>
    startTransition(async () => {
      setError(null);
      setSent(false);
      try {
        await sendReply({
          leadId,
          channel,
          subject: channel === "email" ? subject : undefined,
          body,
        });
        setBody("");
        setSent(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengirim balasan");
      }
    });

  return (
    <div className="space-y-3 border-t p-4">
      {channels.length > 1 && (
        <div className="flex items-center gap-3">
          <Label htmlFor="inbox-channel" className="text-xs">
            Kirim via
          </Label>
          <Select value={channel} onValueChange={(v) => v && setChannel(v as Channel)}>
            <SelectTrigger id="inbox-channel" className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.includes("whatsapp") && (
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              )}
              {channels.includes("email") && <SelectItem value="email">Email</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      )}
      {channel === "email" && (
        <Input
          placeholder="Subjek email"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      )}
      <Textarea
        placeholder="Tulis balasan..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {sent && !error && (
        <p className="text-sm text-emerald-700">Balasan terkirim.</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Terkirim dari akun {channel === "whatsapp" ? "WhatsApp" : "email"} Anda sendiri.
        </p>
        <Button
          size="sm"
          disabled={pending || !body.trim()}
          onClick={submit}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <SendHorizonal className="h-4 w-4" />
          {pending ? "Mengirim..." : "Kirim Balasan"}
        </Button>
      </div>
    </div>
  );
}
