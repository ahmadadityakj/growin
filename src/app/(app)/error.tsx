"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Terjadi kesalahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "Ada masalah saat memuat halaman ini."}
        </p>
      </div>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
