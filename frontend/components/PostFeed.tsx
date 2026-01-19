"use client"

import { useMemo } from "react"

import { PostCard } from "@/components/PostCard"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed"
import { feedItems as mockFeedItems } from "@/lib/mock-data"
import { useAuthStore } from "@/store/authStore"

type FeedType = "personalized" | "following" | "explore" | "trending"

type PostFeedProps = {
  feedType: FeedType
  emptyTitle: string
  emptyDescription: string
  mockNotice?: string
  showAuthNotice?: boolean
}

export function PostFeed({
  feedType,
  emptyTitle,
  emptyDescription,
  mockNotice,
  showAuthNotice = false,
}: PostFeedProps) {
  const token = useAuthStore((state) => state.token)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    hasApi,
    isError,
  } = useInfiniteFeed(feedType)

  const apiFeedItems = useMemo(
    () => data?.pages.flatMap((page) => page.posts) ?? [],
    [data]
  )
  const showMock = !hasApi || isError

  if (showAuthNotice && !token && hasApi) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            Connect to personalize your feed.
          </p>
          <p>Sign in with your wallet to see followed creators.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && !showMock) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Loading feed...</p>
          <p>Fetching the latest drops.</p>
        </CardContent>
      </Card>
    )
  }

  if (showMock) {
    return (
      <>
        {mockNotice ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Mock feed.</p>
              <p>{mockNotice}</p>
            </CardContent>
          </Card>
        ) : null}
        {mockFeedItems.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </>
    )
  }

  if (apiFeedItems.length === 0) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{emptyTitle}</p>
          <p>{emptyDescription}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {apiFeedItems.map((post) => (
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
      {!hasNextPage && apiFeedItems.length > 0 ? (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You&apos;re all caught up.
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
