"use client";

import { use } from "react";
import Link from "next/link";
import { PostCard } from "@/components/PostCard";
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
    hasApi,
  } = useUserPosts(resolvedWallet ?? "");

  // Get initials from wallet address or username for avatar
  const getInitials = (name: string | null | undefined, address: string) => {
    if (name) {
      return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
    }
    if (address === "me") return "ME";
    return address.slice(0, 2).toUpperCase();
  };

  // Truncate wallet address for display
  const truncateWallet = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Resolve image URL (handle IPFS)
  const resolveImageUrl = (uri: string | null | undefined) => {
    if (!uri) return null;
    if (uri.startsWith("ipfs://")) {
      const cid = uri.replace("ipfs://", "");
      const gateway =
        process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
        process.env.NEXT_PUBLIC_IPFS_GATEWAY;
      return gateway ? `${gateway}/${cid}` : uri;
    }
    return uri;
  };

  // Use fetched user data or fall back to auth user for own profile
  const displayUser = user ?? (isOwnProfile ? authUser : null);
  const displayWallet = resolvedWallet ?? walletParam;

  // Flatten paginated posts
  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];


  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {displayUser?.profileImageUri && (
                  <AvatarImage
                    src={resolveImageUrl(displayUser.profileImageUri) ?? undefined}
                    alt={displayUser.username ?? displayWallet}
                  />
                )}
                <AvatarFallback className="text-lg">
                  {getInitials(displayUser?.username, displayWallet)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Profile
                </p>
                {isLoadingProfile && !displayUser ? (
                  <Skeleton className="mt-1 h-8 w-48" />
                ) : (
                  <h1 className="text-2xl font-semibold text-foreground">
                    {displayUser?.username ?? truncateWallet(displayWallet)}
                  </h1>
                )}
                {displayUser?.username && (
                  <p className="text-sm text-muted-foreground">
                    {truncateWallet(displayWallet)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {displayUser?.isVerified && (
                <Badge variant="secondary">Verified</Badge>
              )}
              {isOwnProfile ? (
                <Button variant="secondary" className="h-9 gap-2" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
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
                    className="h-9"
                    onClick={() => openTipModal(displayWallet)}
                  >
                    Tip
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9"
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
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Followers</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-1 h-6 w-12" />
              ) : (
                <p className="mt-1 text-lg font-semibold text-foreground animate-in fade-in duration-300">
                  {displayUser?.followerCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Following</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-1 h-6 w-12" />
              ) : (
                <p className="mt-1 text-lg font-semibold text-foreground animate-in fade-in duration-300">
                  {displayUser?.followingCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Posts</p>
              {isLoadingProfile && !displayUser ? (
                <Skeleton className="mt-1 h-6 w-12" />
              ) : (
                <p className="mt-1 text-lg font-semibold text-foreground animate-in fade-in duration-300">
                  {displayUser?.postCount?.toLocaleString() ?? "0"}
                </p>
              )}
            </div>
          </div>

          {!hasApi && (
            <p className="text-xs text-muted-foreground">
              Connect to the backend to see real profile stats.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Posts section */}
      <div className="space-y-4">
        {/* Loading state */}
        {isLoadingPosts && posts.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/70 bg-card/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
