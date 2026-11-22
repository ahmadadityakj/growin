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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { t } from "@/lib/i18n";

const menuItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
  { href: "/tasks", icon: Sparkles, label: t.nav.tasks },
  { href: "/products", icon: Package, label: t.nav.products },
  { href: "/campaigns", icon: Megaphone, label: t.nav.campaigns },
  { href: "/research", icon: Search, label: t.nav.research },
  { href: "/leads", icon: Users, label: t.nav.leads },
  { href: "/outreach", icon: Send, label: t.nav.outreach },
  { href: "/follow-ups", icon: Repeat, label: t.nav.followUps },
  { href: "/reports", icon: BarChart3, label: t.nav.reports },
  { href: "/integrations", icon: Plug, label: t.nav.integrations },
  { href: "/settings", icon: Settings, label: t.nav.settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold leading-tight">{t.app.name}</div>
            <div className="text-xs text-muted-foreground">Kreava</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
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
      </SidebarContent>
      <SidebarFooter className="border-t p-3 text-xs text-muted-foreground">
        {t.app.tagline}
      </SidebarFooter>
    </Sidebar>
  );
}
