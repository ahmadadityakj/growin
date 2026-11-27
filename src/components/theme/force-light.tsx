"use client";

import { ThemeProvider } from "next-themes";

/** Paksa light mode untuk halaman publik (landing/auth) — tema gelap hanya di dalam app. */
export function ForceLight({ children }: { children: React.ReactNode }) {
  return <ThemeProvider forcedTheme="light">{children}</ThemeProvider>;
}
