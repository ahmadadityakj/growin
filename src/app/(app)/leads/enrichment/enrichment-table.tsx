"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, MapPin, AtSign, Search, CheckCircle2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { enrichLeadContact } from "../actions";
import type { leads } from "@/server/db/schema";

type Lead = typeof leads.$inferSelect;

function searchLinks(lead: Lead) {
  const q = encodeURIComponent(`${lead.businessName} ${lead.city ?? ""}`.trim());
  return [
    {
      label: "Google",
      icon: Search,
      href: `https://www.google.com/search?q=${q}+kontak+telepon`,
    },
    {
      label: "Maps",
      icon: MapPin,
      href: `https://www.google.com/maps/search/${q}`,
    },
    {
      label: "Instagram",
      icon: AtSign,
      href: `https://www.google.com/search?q=site:instagram.com+${q}`,
    },
    ...(lead.website
      ? [{ label: "Website", icon: ExternalLink, href: lead.website }]
      : []),
  ];
}

function EnrichRow({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [contactPerson, setContactPerson] = useState(lead.contactPerson ?? "");
  const [whatsapp, setWhatsapp] = useState(lead.whatsappNumber ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [verified, setVerified] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await enrichLeadContact(lead.id, {
        contactPerson: contactPerson || null,
        whatsappNumber: whatsapp || null,
        email: email || null,
        verified,
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <TableRow className={saved ? "opacity-50" : ""}>
      <TableCell>
        <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
          {lead.businessName}
        </Link>
        <div className="text-xs text-muted-foreground">
          {[lead.industry, lead.city].filter(Boolean).join(" · ")}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {searchLinks(lead).map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
            >
              <l.icon className="h-3 w-3" /> {l.label}
            </a>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs"
          placeholder="Nama kontak"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs"
          placeholder="08xxx"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs"
          placeholder="email@..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-1.5 text-xs">
          <Checkbox
            checked={verified}
            onCheckedChange={(v) => setVerified(!!v)}
          />
          Verified
        </label>
      </TableCell>
      <TableCell>
        {saved ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Button size="sm" variant="outline" onClick={save} disabled={pending}>
            {pending ? "..." : "Simpan"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function EnrichmentTable({ rows }: { rows: Lead[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bisnis</TableHead>
            <TableHead className="w-28">Cari di</TableHead>
            <TableHead className="w-40">Kontak</TableHead>
            <TableHead className="w-36">WhatsApp</TableHead>
            <TableHead className="w-44">Email</TableHead>
            <TableHead className="w-24"></TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((lead) => (
            <EnrichRow key={lead.id} lead={lead} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
