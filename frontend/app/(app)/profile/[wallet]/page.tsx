"use client";

import { use } from "react";
import Link from "next/link";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostFeed";
import { FollowButton } from "@/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserPosts } from "@/hooks/useUserPosts";
import { FileText, Settings } from "lucide-react";
import { getInitials, formatWallet, resolveImageUrl } from "@/lib/format";

type ProfilePageProps = {
  params: Promise<{
    wallet: string;
  }>;
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { wallet: walletParam } = use(params);
  const openSubscribeModal = useUIStore((state) => state.openSubscribeModal);
  const openTipModal = useUIStore((state) => state.openTipModal);
  const authWallet = useAuthStore((state) => state.wallet);
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);

  // For /profile/me, wait until auth is resolved so we don't render stale data
  const isMe = walletParam === "me";

  // Determine if viewing own profile
  const isOwnProfile = walletParam === "me" || walletParam === authWallet;

  // Resolve the actual wallet address
  const resolvedWallet = walletParam === "me" ? authWallet : walletParam;

  // Fetch user profile data
  const {
    data: user,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useUserProfile(resolvedWallet ?? "");

  // Fetch user posts with infinite scroll
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
  } = useUserPosts(resolvedWallet ?? "");

  // Use fetched user data or fall back to auth user for own profile
  const displayUser = user ?? (isOwnProfile ? authUser : null);
  const displayWallet = resolvedWallet ?? walletParam;

  // Flatten paginated posts
  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];

  // While auth is resolving after hydration, show skeleton instead of stale data
  if (isMe && !authReady) {
    return (
      <div className="space-y-6">
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Separator className="bg-border/70" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        {[1, 2].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {displayUser?.profileImageUri && (
                  <AvatarImage
                    src={resolveImageUrl(displayUser.profileImageUri) ?? undefined}
                    alt={displayUser.username ?? displayWallet}
                  />
                )}
                <AvatarFallback className="text-sm">
                  {getInitials(displayUser?.username, displayWallet)}
                </AvatarFallback>
              </Avatar>
              <div>
                {isLoadingProfile && !displayUser ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <h1 className="text-base font-semibold text-foreground">
                    {displayUser?.username ?? formatWallet(displayWallet, 6)}
                  </h1>
                )}
                {displayUser?.username && (
                  <p className="text-xs text-muted-foreground">
                    {formatWallet(displayWallet, 6)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {displayUser?.isVerified && (
                <Badge variant="secondary" className="text-[10px]">Verified</Badge>
              )}
              {isOwnProfile ? (
                <Button variant="secondary" className="h-8 gap-1.5 text-xs" asChild>
                  <Link href="/settings">
                    <Settings className="h-3.5 w-3.5" />
                    Edit Profile
                  </Link>
                </Button>
              ) : (
                <>
                  <FollowButton
                    wallet={displayWallet}
                    initialFollowing={user?.isFollowing ?? false}
                  />
                  <Button
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => openTipModal(displayWallet)}
                  >
                    Tip
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => openSubscribeModal(displayWallet)}
                  >
                    Subscribe
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Bio section */}
          {displayUser?.bio && (
            <p className="text-sm text-foreground leading-relaxed">
              {displayUser.bio}
            </p>
          )}

          <Separator className="bg-border/70" />

          {/* Stats section */}
          <div className="grid grid-cols-3 gap-3 text-muted-foreground">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em]">Followers</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-0.5 h-5 w-8" />
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {displayUser?.followerCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em]">Following</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-0.5 h-5 w-8" />
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {displayUser?.followingCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em]">Posts</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-0.5 h-5 w-8" />
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {displayUser?.postCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Posts section */}
      <div className="space-y-4">
        {/* Loading state */}
        {isLoadingPosts && posts.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </>
        )}

        {/* Error state */}
        {profileError && (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Unable to load profile. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Real posts from API */}
        {posts.length > 0 && posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {/* Empty state when no posts */}
        {!isLoadingPosts && posts.length === 0 && !profileError && (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No posts yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {isOwnProfile
                  ? "Share your first post to get started!"
                  : "This user hasn't posted anything yet."}
              </p>
              {isOwnProfile && (
                <Button variant="secondary" className="mt-4" asChild>
                  <Link href="/create">Create Post</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}


        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
