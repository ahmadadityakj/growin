"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Inbox,
  LayoutDashboard,
  Sparkles,
  Package,
  Megaphone,
  Search,
  Users,
  KanbanSquare,
  Send,
  Repeat,
  BarChart3,
  Plug,
  Settings,
  Sprout,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { t } from "@/lib/i18n";
import { SidebarSprout } from "@/components/illustrations/sidebar-sprout";

const menuGroups = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
      { href: "/inbox", icon: Inbox, label: t.nav.inbox },
      { href: "/tasks", icon: Sparkles, label: t.nav.tasks },
    ],
  },
  {
    label: "Prospek",
    items: [
      { href: "/research", icon: Search, label: t.nav.research },
      { href: "/leads", icon: Users, label: t.nav.leads },
      { href: "/pipeline", icon: KanbanSquare, label: t.nav.pipeline },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/products", icon: Package, label: t.nav.products },
      { href: "/campaigns", icon: Megaphone, label: t.nav.campaigns },
      { href: "/outreach", icon: Send, label: t.nav.outreach },
      { href: "/follow-ups", icon: Repeat, label: t.nav.followUps },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/reports", icon: BarChart3, label: t.nav.reports },
      { href: "/integrations", icon: Plug, label: t.nav.integrations },
      { href: "/billing", icon: CreditCard, label: "Billing" },
      { href: "/settings", icon: Settings, label: t.nav.settings },
    ],
  },
];

export function AppSidebar({
  isOwner = true,
  replyCount = 0,
}: {
  isOwner?: boolean;
  replyCount?: number;
}) {
  const pathname = usePathname();
  const groups = isOwner
    ? menuGroups
    : menuGroups.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.href !== "/integrations" && i.href !== "/billing"),
      }));

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/60 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight tracking-tight">
              {t.app.name}
            </div>
            <div className="text-[11px] leading-tight text-muted-foreground">
              by Kreava
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="px-0 py-1">
            <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        className="h-9 px-2.5 data-[active=true]:bg-emerald-100/70 data-[active=true]:font-semibold data-[active=true]:text-emerald-800 hover:bg-emerald-50/70 hover:text-emerald-900 dark:data-[active=true]:bg-emerald-950/60 dark:data-[active=true]:text-emerald-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
                        render={
                          <Link href={item.href}>
                            <item.icon
                              className={`h-4 w-4 ${active ? "text-emerald-600" : ""}`}
                            />
                            <span>{item.label}</span>
                            {item.href === "/inbox" && replyCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                                {replyCount > 99 ? "99+" : replyCount}
                              </span>
                            )}
                          </Link>
                        }
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="relative overflow-hidden border-t border-sidebar-border/60 px-4 pb-0 pt-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-100/70 via-emerald-50/40 to-transparent dark:from-emerald-950/60 dark:via-emerald-950/20" />
        <p className="relative text-[11px] leading-relaxed text-muted-foreground">
          {t.app.tagline}
        </p>
        <SidebarSprout className="relative -mx-4 mt-1 h-[72px] w-[calc(100%+2rem)] text-emerald-300/80 dark:text-emerald-800/80" />
      </SidebarFooter>
    </Sidebar>
  );
}
