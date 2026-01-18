"use client";

import { PostFeed } from "@/components/PostFeed";
import { Badge } from "@/components/ui/badge";

export default function ExplorePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Explore
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Trending creators and drops
          </h1>
        </div>
        <Badge variant="secondary">Live updates</Badge>
      </div>
      <div className="space-y-4">
        <PostFeed
          feedType="explore"
          emptyTitle="Nothing trending yet."
          emptyDescription="Check back once creators start posting."
        />
      </div>
    </div>
  );
}
