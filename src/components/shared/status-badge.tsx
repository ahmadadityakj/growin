import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  colorClass,
}: {
  label: string;
  colorClass?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("font-normal", colorClass)}>
      {label}
    </Badge>
  );
}
