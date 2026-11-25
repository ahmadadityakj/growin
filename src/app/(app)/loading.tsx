export default function Loading() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Memuat">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        Memuat…
      </div>
    </div>
  );
}
