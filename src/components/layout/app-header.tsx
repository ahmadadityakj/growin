"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AppHeader({
  userName,
  userEmail,
}: {
  userName?: string | null;
  userEmail?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = (userName ?? userEmail ?? "U")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex h-10 items-center gap-2 rounded-full px-1.5 pr-3 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                  {initials || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {userName ?? userEmail}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-1.5 py-1.5">
            <div className="font-medium">{userName}</div>
            <div className="text-xs text-muted-foreground">{userEmail}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                // redirect: false + router nav — lebih cepat dari hard reload
                await signOut({ redirect: false });
                router.replace("/login");
                router.refresh();
              })
            }
          >
            <LogOut className="mr-2 h-4 w-4" />
            {pending ? "Keluar..." : t.common.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
