export type DayActivity = { label: string; sent: number; replies: number };

/**
 * Bar chart SVG aktivitas 7 hari: pesan terkirim (emerald muda) vs
 * balasan masuk (teal tua). Data asli dari DB — motif "grafik naik".
 */
export function WeeklyActivity({ days }: { days: DayActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.sent));
  const H = 72; // tinggi area bar dalam px

  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: H + 22 }}>
        {days.map((d, i) => {
          const sentH = Math.max(d.sent > 0 ? 8 : 3, Math.round((d.sent / max) * H));
          const repH = d.replies > 0 ? Math.max(6, Math.round((d.replies / max) * H)) : 0;
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
              <div className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {d.sent} kirim{d.replies > 0 ? ` · ${d.replies} balas` : ""}
              </div>
              <div className="flex items-end gap-1" style={{ height: H }}>
                <div
                  className="w-3 rounded-t-md bg-emerald-300/70 transition-colors group-hover:bg-emerald-400 sm:w-4 dark:bg-emerald-800 dark:group-hover:bg-emerald-700"
                  style={{ height: sentH }}
                />
                {repH > 0 && (
                  <div
                    className="w-3 rounded-t-md bg-teal-600 transition-colors group-hover:bg-teal-500 sm:w-4"
                    style={{ height: repH }}
                  />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">{d.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300/70 dark:bg-emerald-800" /> Terkirim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> Balasan
        </span>
      </div>
    </div>
  );
}
