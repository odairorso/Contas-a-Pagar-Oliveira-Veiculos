import { cn } from "@/lib/utils";
import { type BillStatus, getStatusLabel } from "@/data/bills";

const statusStyles: Record<BillStatus, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-primary/10 text-primary",
  overdue: "bg-destructive/10 text-destructive",
  scheduled: "bg-warning/10 text-warning",
};

export function StatusBadge({ status }: { status: BillStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", statusStyles[status])}>
      {getStatusLabel(status)}
    </span>
  );
}
