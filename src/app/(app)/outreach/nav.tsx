"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/outreach/messages", label: "Pesan" },
  { href: "/outreach/templates", label: "Templates" },
  { href: "/outreach/generate", label: "AI Generator" },
];

export function OutreachNav() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-1 border-b">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium -mb-px",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
