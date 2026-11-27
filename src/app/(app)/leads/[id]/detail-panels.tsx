"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LEAD_STATUSES } from "@/lib/constants";
import { t } from "@/lib/i18n";
import {
  updateLeadStatus, addTagToLead, removeTagFromLead, createTag,
  addLeadToCampaign, removeLeadFromCampaign, addLeadNote,
  addLeadContact, deleteLeadContact,
} from "../actions";
import { scoreLead } from "../../research/actions";
import type { LeadStatus } from "@/server/services/lead-service";

function useRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  return { pending, run };
}

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  const { run } = useRefresh();
  return (
    <Select
      value={status}
      onValueChange={(v) => v && run(() => updateLeadStatus(leadId, v as LeadStatus))}
    >
      <SelectTrigger className="h-8 w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{t.leads.statuses[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TagPanel({
  leadId, leadTags, allTags,
}: {
  leadId: string;
  leadTags: { id: string; name: string; color: string | null }[];
  allTags: { id: string; name: string }[];
}) {
  const { run } = useRefresh();
  const [newTag, setNewTag] = useState("");
  const [selected, setSelected] = useState("");

  const available = allTags.filter((tag) => !leadTags.some((lt) => lt.id === tag.id));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {leadTags.length === 0 && <span className="text-sm text-muted-foreground">-</span>}
          {leadTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1">
              {tag.name}
              <button onClick={() => run(() => removeTagFromLead(leadId, tag.id))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          {available.length > 0 && (
            <>
              <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Pilih tag" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline" disabled={!selected}
                onClick={() => run(async () => { await addTagToLead(leadId, selected); setSelected(""); })}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            className="h-8" placeholder="Tag baru..."
            value={newTag} onChange={(e) => setNewTag(e.target.value)}
          />
          <Button
            size="sm" variant="outline" disabled={!newTag.trim()}
            onClick={() =>
              run(async () => {
                const id = await createTag(newTag.trim());
                if (id) await addTagToLead(leadId, id);
                setNewTag("");
              })
            }
          >
            Buat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignPanel({
  leadId, memberships, allCampaigns,
}: {
  leadId: string;
  memberships: { id: string; name: string; clStatus: string }[];
  allCampaigns: { id: string; name: string }[];
}) {
  const { run } = useRefresh();
  const [selected, setSelected] = useState("");
  const available = allCampaigns.filter((c) => !memberships.some((m) => m.id === c.id));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Kampanye</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {memberships.length === 0 && (
          <span className="text-sm text-muted-foreground">Belum masuk kampanye</span>
        )}
        <ul className="space-y-2">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.name} <Badge variant="outline" className="ml-1">{m.clStatus}</Badge></span>
              <Button
                variant="ghost" size="icon-xs"
                onClick={() => run(() => removeLeadFromCampaign(leadId, m.id))}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
        {available.length > 0 && (
          <div className="flex gap-2">
            <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
              <SelectTrigger className="h-8 flex-1">
                <SelectValue placeholder="Tambah ke kampanye" />
              </SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm" variant="outline" disabled={!selected}
              onClick={() => run(async () => { await addLeadToCampaign(leadId, selected); setSelected(""); })}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ContactsPanel({
  leadId, contacts,
}: {
  leadId: string;
  contacts: { id: string; name: string; role: string | null; email: string | null; phone: string | null; whatsappNumber: string | null }[];
}) {
  const { run } = useRefresh();
  const [showForm, setShowForm] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      await addLeadContact(leadId, {
        name: fd.get("name") as string,
        role: (fd.get("role") as string) || undefined,
        email: (fd.get("email") as string) || undefined,
        phone: (fd.get("phone") as string) || undefined,
        whatsappNumber: (fd.get("whatsapp") as string) || undefined,
      });
      setShowForm(false);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Kontak</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {contacts.length === 0 && !showForm && (
          <span className="text-sm text-muted-foreground">Belum ada kontak tambahan</span>
        )}
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between text-sm">
              <div>
                <div className="font-medium">{c.name} {c.role && <span className="text-muted-foreground">({c.role})</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.email, c.phone, c.whatsappNumber].filter(Boolean).join(" · ")}
                </div>
              </div>
              <ConfirmDialog
                title={`Hapus kontak ${c.name}?`}
                onConfirm={() => deleteLeadContact(c.id, leadId)}
                trigger={<Button variant="ghost" size="icon-xs"><Trash2 className="h-3 w-3 text-destructive" /></Button>}
              />
            </li>
          ))}
        </ul>
        {showForm && (
          <form onSubmit={submit} className="space-y-2 rounded-md border p-3">
            <Input name="name" placeholder="Nama *" required className="h-8" />
            <Input name="role" placeholder="Jabatan" className="h-8" />
            <Input name="email" placeholder="Email" type="email" className="h-8" />
            <Input name="phone" placeholder="Telepon" className="h-8" />
            <Input name="whatsapp" placeholder="WhatsApp" className="h-8" />
            <Button size="sm" type="submit">{t.common.save}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ScoreButton({ leadId }: { leadId: string }) {
  const { pending, run } = useRefresh();
  return (
    <Button
      size="sm" variant="outline" disabled={pending}
      onClick={() => run(() => scoreLead(leadId))}
    >
      {pending ? "Menilai..." : "Nilai dengan AI"}
    </Button>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  const { pending, run } = useRefresh();
  const [note, setNote] = useState("");
  return (
    <div className="flex gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tambah catatan..."
        rows={2}
        className="flex-1"
      />
      <Button
        size="sm"
        disabled={!note.trim() || pending}
        onClick={() => run(async () => { await addLeadNote(leadId, note); setNote(""); })}
      >
        Simpan
      </Button>
    </div>
  );
}
