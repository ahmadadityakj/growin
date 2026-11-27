"use client";

import { useEffect } from "react";

/** Paksa light mode untuk halaman publik (landing/auth) — tema gelap hanya di dalam app. */
export function ForceLight({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove("dark", "light");
    el.style.colorScheme = "light";
    return () => {
      el.style.colorScheme = "";
    };
  }, []);
  return <>{children}</>;
}
