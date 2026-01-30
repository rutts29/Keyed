import type { AirdropStatus } from "@/types";

export const statusConfig: Record<AirdropStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  funded: { label: "Funded", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  processing: { label: "Processing", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};
