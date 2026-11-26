import Link from "next/link";
import { Clock } from "lucide-react";
import { TRIAL_LIMITS } from "@/lib/billing";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const urgent = daysLeft <= 3;
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs sm:text-sm ${
        urgent ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-900"
      }`}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Clock className="h-3.5 w-3.5" />
        Trial: {daysLeft} hari tersisa
      </span>
      <span className="opacity-80">
        Batas: {TRIAL_LIMITS.maxLeads} leads · {TRIAL_LIMITS.maxProducts} produk ·{" "}
        {TRIAL_LIMITS.researchJobsPerMonth} riset/bulan (maks {TRIAL_LIMITS.researchTargetMax}/job)
      </span>
      <Link href="/#harga" className="font-semibold underline underline-offset-2">
        Upgrade
      </Link>
    </div>
  );
}
