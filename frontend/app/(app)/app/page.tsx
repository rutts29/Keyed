"use client";

import { useMemo, useState } from "react";

import { FeedComposer } from "@/components/FeedComposer";
import { PostCard } from "@/components/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { posts } from "@/lib/mock-data";
import { useAuthStore } from "@/store/authStore";

export default function AppFeedPage() {
  const [feedType, setFeedType] = useState<"personalized" | "following">(
    "personalized"
  );
  const token = useAuthStore((state) => state.token);
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    hasApi,
    isError,
  } = useInfiniteFeed(feedType);

  const feedItems = useMemo(
    () => data?.pages.flatMap((page) => page.posts) ?? [],
    [data]
  );
  const showMock = !hasApi || isError;
  const showAuthNotice = !token && feedType !== "explore";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(227,106,29,0.35)] animate-[pulse_2s_ease-in-out_infinite]" />
          Live · 32 creators
        </div>
      </div>

      <FeedComposer />

      <Tabs
        value={feedType}
        onValueChange={(value) =>
          setFeedType(value === "following" ? "following" : "personalized")
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="personalized">For you</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
      </Tabs>

      <Separator className="bg-border/70" />

      <div className="space-y-4">
        {showAuthNotice ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Connect to personalize your feed.
              </p>
              <p>Sign in with your wallet to see followed creators.</p>
            </CardContent>
          </Card>
        ) : isLoading && !showMock ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Loading feed...</p>
              <p>Fetching the latest drops.</p>
            </CardContent>
          </Card>
        ) : showMock ? (
          <>
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Mock feed.</p>
                <p>Set NEXT_PUBLIC_API_URL to load live data.</p>
              </CardContent>
            </Card>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </>
        ) : feedItems.length === 0 ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">No posts yet.</p>
              <p>Follow creators or publish your first update.</p>
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
