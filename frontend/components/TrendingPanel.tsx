"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Hash } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { RightRailCard } from "@/components/RightRailCard";
import { useTrendingTopics } from "@/hooks/useTrendingTopics";
import { formatCompactCount } from "@/lib/format";

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    case "down":
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    case "stable":
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
}

export function TrendingPanel() {
  const { topics, isLoading } = useTrendingTopics();

  const displayTopics = topics.slice(0, 5);
  const hasMoreTopics = topics.length > 5;

  return (
    <RightRailCard
      title="Trending"
      action={null}
    >
      {isLoading ? (
        Array.from({ length: 3 }).map((_, index) => (
          <div key={`trend-skeleton-${index}`} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))
      ) : topics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trending topics right now.
        </p>
      ) : (
        <>
          {displayTopics.map((topic) => (
            <Link
              key={topic.name}
              href={`/search?q=${encodeURIComponent(topic.name)}`}
              className="group block space-y-1 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {topic.name}
                </p>
                <TrendIcon trend={topic.trend} />
              </div>
              <p className="text-xs text-muted-foreground pl-5">
                {`${formatCompactCount(topic.postCount)} posts`}
              </p>
            </Link>
          ))}
          {hasMoreTopics && (
            <Link
              href="/search"
              className="block text-xs text-primary hover:underline pt-1"
            >
              See all
            </Link>
          )}
        </>
      )}
    </RightRailCard>
  );
}
