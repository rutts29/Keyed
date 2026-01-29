"use client";

import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";

import { FollowButton } from "@/components/FollowButton";
import { RightRailCard } from "@/components/RightRailCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuggestedUsers } from "@/hooks/useSuggestedUsers";
import { getInitials, formatWallet, formatCompactCount } from "@/lib/format";

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function SuggestedUsers() {
  const { users, isLoading } = useSuggestedUsers();

  return (
    <RightRailCard
      title="Suggested creators"
      action={null}
    >
      {isLoading ? (
        // Loading skeleton state
        Array.from({ length: 3 }).map((_, index) => (
          <div key={`user-skeleton-${index}`} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        ))
      ) : users.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Users className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No suggestions yet</p>
          <p className="text-xs text-muted-foreground">
            Follow more creators to get personalized recommendations
          </p>
        </div>
      ) : (
        // Users list
        users.map((user) => (
          <div
            key={user.wallet}
            className="group flex items-center gap-3 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-muted/50"
          >
            <Link href={`/profile/${user.wallet}`} className="shrink-0">
              <Avatar className="h-10 w-10 transition-opacity group-hover:opacity-80">
                {user.profileImageUri && (
                  <AvatarImage
                    src={user.profileImageUri}
                    alt={user.username ?? "User avatar"}
                  />
                )}
                <AvatarFallback>
                  {getInitials(user.username, user.wallet)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${user.wallet}`}
                className="flex items-center gap-1 transition-opacity hover:opacity-80"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {user.username
                    ? truncateText(user.username, 16)
                    : formatWallet(user.wallet)}
                </span>
                {user.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </Link>
              <p className="text-xs text-muted-foreground">
                {`${formatCompactCount(user.followerCount)} followers`}
              </p>
              {user.bio && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {user.bio}
                </p>
              )}
            </div>
            <FollowButton wallet={user.wallet} />
          </div>
        ))
      )}

      {/* See all link */}
      {!isLoading && users.length > 0 && (
        <Link
          href="/explore/creators"
          className="block text-center text-xs text-primary transition-colors hover:text-primary/80"
        >
          See all
        </Link>
      )}
    </RightRailCard>
  );
}
