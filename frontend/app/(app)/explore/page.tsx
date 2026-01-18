"use client";

import { useMemo } from "react";

import { PostCard } from "@/components/PostCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { posts } from "@/lib/mock-data";

export default function ExplorePage() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    hasApi,
    isError,
  } = useInfiniteFeed("explore");

  const feedItems = useMemo(
    () => data?.pages.flatMap((page) => page.posts) ?? [],
    [data]
  );
  const showMock = !hasApi || isError;

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
        {isLoading && !showMock ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Loading explore.</p>
              <p>Fetching trending drops.</p>
            </CardContent>
          </Card>
        ) : showMock ? (
          posts.length === 0 ? (
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Nothing trending yet.
                </p>
                <p>Check back once creators start posting.</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : feedItems.length === 0 ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Nothing trending yet.
              </p>
              <p>Check back once creators start posting.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {feedItems.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} />
            {isFetchingNextPage ? (
              <Card className="border-border/70 bg-card/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {!hasNextPage && feedItems.length > 0 ? (
              <Card className="border-border/70 bg-card/70">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  You&apos;re all caught up.
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
