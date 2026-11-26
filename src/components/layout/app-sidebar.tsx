"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

const menuGroups = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
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
      { href: "/settings", icon: Settings, label: t.nav.settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

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
        {menuGroups.map((group) => (
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
                        className="h-9 px-2.5 data-[active=true]:bg-emerald-100/70 data-[active=true]:font-semibold data-[active=true]:text-emerald-800 hover:bg-emerald-50/70 hover:text-emerald-900"
                        render={
                          <Link href={item.href}>
                            <item.icon
                              className={`h-4 w-4 ${active ? "text-emerald-600" : ""}`}
                            />
                            <span>{item.label}</span>
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

      <SidebarFooter className="border-t border-sidebar-border/60 p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.app.tagline}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
