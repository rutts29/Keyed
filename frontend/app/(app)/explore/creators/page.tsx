"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BadgeCheck, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/FollowButton";
import { useExploreCreators } from "@/hooks/useExploreCreators";
import type { UserProfile } from "@/types";
import { getInitials, formatWallet, formatCompactCount, resolveImageUrl } from "@/lib/format";

function CreatorCard({ user }: { user: UserProfile }) {
  const imageUrl = resolveImageUrl(user.profileImageUri);

  return (
    <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Link href={`/profile/${user.wallet}`} className="shrink-0">
            <Avatar className="h-12 w-12">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={user.username ?? ""} />
              ) : null}
              <AvatarFallback>
                {getInitials(user.username, user.wallet)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/profile/${user.wallet}`}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.username ?? formatWallet(user.wallet)}
                </span>
                {user.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </Link>
              <FollowButton wallet={user.wallet} />
            </div>
            {user.username && (
              <p className="text-xs text-muted-foreground">
                {formatWallet(user.wallet)}
              </p>
            )}
            {user.bio && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {user.bio}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">
                  {formatCompactCount(user.followerCount)}
                </span>{" "}
                followers
              </span>
              <span>
                <span className="font-semibold text-foreground">
                  {formatCompactCount(user.postCount)}
                </span>{" "}
                posts
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatorSkeleton() {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExploreCreatorsPage() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
  } = useExploreCreators();

  const creators = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.users) ?? [];
    const seen = new Set<string>();
    return all.filter((u) => {
      if (seen.has(u.wallet)) return false;
      seen.add(u.wallet);
      return true;
    });
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Explore
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Creators
          </h1>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <CreatorSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && creators.length === 0 && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No creators yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Be the first to set up your profile and start creating.
            </p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link href="/settings">Set up profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Creators grid */}
      {creators.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {creators.map((user) => (
            <CreatorCard key={user.wallet} user={user} />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage && (
            <div className="grid gap-4 sm:grid-cols-2 w-full">
              <CreatorSkeleton />
              <CreatorSkeleton />
            </div>
          )}
        </div>
      )}

      {/* End of list */}
      {!isLoading && !hasNextPage && creators.length > 0 && (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            You&apos;ve seen all creators.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
