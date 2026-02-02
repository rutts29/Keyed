"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";

import { NotificationItem } from "@/components/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
  type NotificationType,
} from "@/hooks/useNotifications";

const filters: { label: string; value: NotificationType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Likes", value: "like" },
  { label: "Comments", value: "comment" },
  { label: "Follows", value: "follow" },
  { label: "Tips", value: "tip" },
  { label: "Airdrops", value: "airdrop_received" },
];

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/70 bg-card/70">
          <CardContent className="flex items-center gap-3 p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType | undefined>(undefined);
  const tabValue = filter ?? "all";

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useNotifications(filter);

  const [paginationError, setPaginationError] = useState(false);
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;
  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target?.isIntersecting && hasNextPage && !isFetchingNextPage && !paginationError) {
        fetchNextPage().catch(() => setPaginationError(true));
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, paginationError]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      <Tabs
        value={tabValue}
        onValueChange={(v) =>
          setFilter(v === "all" ? undefined : (v as NotificationType))
        }
        className="w-full"
      >
        <TabsList className="flex w-full bg-muted/40">
          {filters.map((f) => (
            <TabsTrigger key={f.label} value={f.value ?? "all"} className="flex-1 text-xs">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <NotificationSkeleton />}

      {!isLoading && isError && (
        <Card className="border-border/70 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-destructive">
              Failed to load notifications. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              No notifications yet
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              When someone interacts with your content, you&apos;ll see it here.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && <NotificationSkeleton />}
          {paginationError && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaginationError(false);
                  fetchNextPage().catch(() => setPaginationError(true));
                }}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Retry loading more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
