import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RightRailCard } from "@/components/RightRailCard";
import type { Trend } from "@/lib/mock-data";

type TrendingPanelProps = {
  trends: Trend[];
};

export function TrendingPanel({ trends }: TrendingPanelProps) {
  return (
    <RightRailCard
      title="Trending"
      action={
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          View all
        </Button>
      }
    >
      {trends.length === 0
        ? Array.from({ length: 3 }).map((_, index) => (
            <div key={`trend-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        : trends.map((trend) => (
            <div key={trend.topic} className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {trend.topic}
              </p>
              <p className="text-xs text-muted-foreground">{trend.label}</p>
              <p className="text-xs text-muted-foreground">{trend.posts}</p>
            </div>
          ))}
    </RightRailCard>
  );
}
