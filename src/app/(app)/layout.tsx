import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getBillingStatus } from "@/lib/billing";
import { TrialBanner } from "@/components/layout/trial-banner";
import { TrialExpired } from "@/components/layout/trial-expired";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const billing = await getBillingStatus(session.user.id);
  if (billing.expired) return <TrialExpired />;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader userName={session.user.name} userEmail={session.user.email} />
        {billing.isTrial && billing.daysLeft !== null && (
          <TrialBanner daysLeft={billing.daysLeft} />
        )}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
