"use client";

type AirdropProgressProps = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
};

export function AirdropProgress({
  total,
  sent,
  failed,
  pending,
}: AirdropProgressProps) {
  const sentPct = total > 0 ? (sent / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${sentPct}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${failedPct}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-green-500">{sent} sent</span>
        <span>{pending} pending</span>
        {failed > 0 && <span className="text-red-500">{failed} failed</span>}
        <span>{total} total</span>
      </div>
    </div>
  );
}
