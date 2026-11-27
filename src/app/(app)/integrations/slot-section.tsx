"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { IntegrationCard } from "./integration-card";
import { setSlotProviderAction } from "./actions";
import type { ProviderKey, SlotKey } from "@/server/services/integration-service";

export interface SlotOption {
  value: ProviderKey | "platform";
  label: string;
  hint: string;
}

export interface ProviderCardData {
  fields: { key: string; label: string; secret: boolean }[];
  existing: { name: string; fields: string[] } | null;
  status: string;
  statusColor: string;
  note?: string;
  lastError?: string;
  lastErrorAt?: string;
  lastFallbackAt?: string;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Satu slot kemampuan: pilih provider aktif, form credential provider terpilih di bawahnya. */
export function SlotSection({
  slot,
  title,
  description,
  options,
  selected,
  providers,
  platformNote,
  isOwner,
}: {
  slot: SlotKey;
  title: string;
  description: string;
  options: SlotOption[];
  selected: string | null;
  providers: Partial<Record<ProviderKey, ProviderCardData>>;
  platformNote?: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value: string) {
    startTransition(async () => {
      await setSlotProviderAction(slot, value as ProviderKey | "platform");
      router.refresh();
    });
  }

  const active = selected && selected !== "platform" ? providers[selected as ProviderKey] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          {active && (
            <StatusBadge
              label={active.existing ? active.status : "belum_lengkap"}
              colorClass={active.existing ? active.statusColor : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"}
            />
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwner ? (
          <div className="space-y-1.5" role="radiogroup" aria-label={`Provider ${title}`}>
            {options.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected === opt.value
                    ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/40"
                    : "border-border/60 hover:bg-muted/40"
                } ${pending ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={`slot-${slot}`}
                  checked={selected === opt.value}
                  onChange={() => choose(opt.value)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {selected === "platform"
              ? "Menggunakan bawaan platform."
              : selected
                ? `Provider aktif: ${options.find((o) => o.value === selected)?.label ?? selected}`
                : "Belum ada provider dipilih."}{" "}
            Kredensial hanya bisa dikelola oleh pemilik workspace.
          </p>
        )}

        {isOwner && selected === "platform" && platformNote && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            {platformNote}
          </p>
        )}

        {isOwner && active && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            {active.note && (
              <p className="text-xs leading-relaxed text-muted-foreground/80">{active.note}</p>
            )}
            {(active.lastError || active.lastFallbackAt) && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {active.lastError && (
                  <p>
                    Terakhir error ({fmtDate(active.lastErrorAt)}): {active.lastError}
                  </p>
                )}
                {active.lastFallbackAt && (
                  <p>
                    Sistem fallback ke platform pada {fmtDate(active.lastFallbackAt)} — selama kuota
                    paket Anda masih ada.
                  </p>
                )}
              </div>
            )}
            <IntegrationCard
              provider={selected as ProviderKey}
              fields={active.fields}
              existing={active.existing}
            />
          </div>
        )}

        {isOwner && !selected && (
          <p className="text-xs text-muted-foreground">Pilih salah satu provider untuk mengaktifkan.</p>
        )}
      </CardContent>
    </Card>
  );
}
