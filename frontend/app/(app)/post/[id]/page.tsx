"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Heart,
  Lock,
  MessageCircle,
  RefreshCw,
  Share2,
} from "lucide-react";

import { CommentSection } from "@/components/CommentSection";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { TokenGateBadge } from "@/components/TokenGateBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerifyNftAccess, useVerifyTokenAccess } from "@/hooks/useAccessActions";
import { useAccessVerification } from "@/hooks/useAccessVerification";
import { usePost } from "@/hooks/useInteractions";
import { useUIStore } from "@/store/uiStore";
import { getInitials, formatTimestamp, resolveImageUrl } from "@/lib/format";

type PostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function PostSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Separator className="bg-border/70" />
          <div className="flex justify-between">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PostNotFound() {
  return (
    <div className="space-y-5">
      <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Post not found</h2>
            <p className="text-sm text-muted-foreground">
              This post may have been deleted or you may not have permission to view it.
            </p>
          </div>
          <Button asChild>
            <Link href="/home">Return to feed</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-5">
      <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load this post. Please check your connection and try again.
            </p>
          </div>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PostPage({ params }: PostPageProps) {
  const { id } = use(params);
  const openTipModal = useUIStore((state) => state.openTipModal);

  const {
    data: post,
    isLoading: isLoadingPost,
    isError: isPostError,
    error: postError,
    refetch: refetchPost,
  } = usePost(id);

  const {
    data: accessData,
    isLoading: isLoadingAccess,
    isError: isAccessError,
  } = useAccessVerification(id);

  const { mutateAsync: verifyToken, isPending: isVerifyingToken } =
    useVerifyTokenAccess(id);
  const { mutateAsync: verifyNft, isPending: isVerifyingNft } =
    useVerifyNftAccess(id);
  const [nftMint, setNftMint] = useState("");

  const hasAccess = accessData?.hasAccess;
  const requirements = accessData?.requirements;
  const isTokenGated = post?.isTokenGated;

  const handleVerifyToken = async () => {
    try {
      await verifyToken();
      toast.success("Access verified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  const handleVerifyNft = async () => {
    if (!nftMint.trim()) {
      toast.error("Enter your NFT mint");
      return;
    }
    try {
      await verifyNft(nftMint.trim());
      toast.success("Access verified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  // Loading state
  if (isLoadingPost) {
    return <PostSkeleton />;
  }

  // Post not found
  if (isPostError && postError?.message === "Post not found") {
    return <PostNotFound />;
  }

  // Network error
  if (isPostError) {
    return <NetworkError onRetry={() => refetchPost()} />;
  }

  // No post data
  if (!post) {
    return <PostNotFound />;
  }

  const imageUrl = resolveImageUrl(post.contentUri);
  const authorName = post.creator.username ?? post.creator.wallet;
  const authorHandle = post.creator.username
    ? `@${post.creator.username}`
    : post.creator.wallet.slice(0, 8) + "...";
  const initials = getInitials(post.creator.username, post.creator.wallet);
  const avatarUrl = resolveImageUrl(post.creator.profileImageUri);

  // Determine if content should be hidden
  const shouldBlurContent = isTokenGated && !hasAccess;

  return (
    <div className="space-y-5">
      {/* Back navigation */}
      <Link href="/home" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      {/* Main post card */}
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Creator header */}
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/profile/${post.creator.wallet}`}
              className="flex items-start gap-3 hover:opacity-80"
            >
              <Avatar className="h-12 w-12">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={authorName} /> : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{authorName}</span>
                  {post.creator.isVerified ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{authorHandle}</p>
              </div>
            </Link>
            <FollowButton
              wallet={post.creator.wallet}
              initialFollowing={post.isFollowing}
            />
          </div>

          {/* Content area */}
          <div className="relative">
            {/* Token gated overlay */}
            {shouldBlurContent ? (
              <div className="relative">
                {imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-auto max-h-[600px] w-full object-cover blur-xl"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                      <div className="rounded-full bg-muted p-4">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 font-semibold text-foreground">Content locked</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Verify access to view this content
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-muted/30 p-12">
                    <div className="rounded-full bg-muted p-4">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mt-4 font-semibold text-foreground">Content locked</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Verify access to view this content
                    </p>
                  </div>
                )}
              </div>
            ) : imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
                <img
                  src={imageUrl}
                  alt={post.altText ?? ""}
                  className="h-auto max-h-[600px] w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          {/* Caption - only show full caption if has access or not gated */}
          {!shouldBlurContent && post.caption ? (
            <p className="whitespace-pre-wrap text-foreground">{post.caption}</p>
          ) : shouldBlurContent ? (
            <p className="text-muted-foreground italic">
              Caption hidden - verify access to view
            </p>
          ) : null}

          {/* AI-generated tags */}
          {!shouldBlurContent && post.autoTags && post.autoTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.autoTags.map((tag) => (
                <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="text-xs hover:bg-muted">
                    #{tag}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {/* Timestamp and metadata */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatTimestamp(post.timestamp)}
            </span>
            {isTokenGated ? <TokenGateBadge /> : null}
            {post.sceneType ? (
              <Badge variant="secondary" className="text-xs">
                {post.sceneType}
              </Badge>
            ) : null}
            {post.mood ? (
              <Badge variant="secondary" className="text-xs">
                {post.mood}
              </Badge>
            ) : null}
          </div>

          <Separator className="bg-border/70" />

          {/* Stats and actions */}
          <div className="flex flex-wrap items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                {post.likes} {post.likes === 1 ? "like" : "likes"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {post.comments} {post.comments === 1 ? "comment" : "comments"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Share2 className="h-4 w-4" />
                {post.tipsReceived} {post.tipsReceived === 1 ? "tip" : "tips"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LikeButton
                postId={post.id}
                initialLiked={post.isLiked ?? false}
                initialLikes={post.likes}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => openTipModal(post.creatorWallet, post.id)}
              >
                <Share2 className="h-3.5 w-3.5" />
                Tip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access verification card - show for token gated posts without access */}
      {isTokenGated && !hasAccess ? (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="space-y-4 p-6 text-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {isLoadingAccess
                    ? "Checking access..."
                    : isAccessError
                    ? "Unable to verify access"
                    : "Token gated content"}
                </p>
                <p className="text-muted-foreground">
                  Verify your token or NFT holdings to unlock this post.
                </p>
                {requirements ? (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {requirements.requiredToken ? (
                      <p>Required token: {requirements.requiredToken}</p>
                    ) : null}
                    {requirements.minimumBalance ? (
                      <p>Minimum balance: {requirements.minimumBalance}</p>
                    ) : null}
                    {requirements.requiredNftCollection ? (
                      <p>Required NFT: {requirements.requiredNftCollection}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <Separator className="bg-border/70" />
            <div className="flex flex-wrap items-end gap-3">
              {requirements?.requiredToken || requirements?.minimumBalance ? (
                <Button
                  className="h-9"
                  disabled={isLoadingAccess || Boolean(hasAccess) || isVerifyingToken}
                  onClick={handleVerifyToken}
                >
                  {isVerifyingToken ? "Verifying..." : "Verify token access"}
                </Button>
              ) : null}
              {requirements?.requiredNftCollection ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="nft-mint" className="text-xs">
                      NFT mint address
                    </Label>
                    <Input
                      id="nft-mint"
                      value={nftMint}
                      onChange={(event) => setNftMint(event.target.value)}
                      placeholder="Enter mint address"
                      className="h-9 w-56"
                    />
                  </div>
                  <Button
                    className="h-9"
                    disabled={isLoadingAccess || Boolean(hasAccess) || isVerifyingNft}
                    onClick={handleVerifyNft}
                  >
                    {isVerifyingNft ? "Verifying..." : "Verify NFT access"}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : isTokenGated && hasAccess ? (
        <Card className="border-border/70 bg-card/70 border-primary/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-2">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Access verified</p>
              <p className="text-sm text-muted-foreground">
                You have full access to this token-gated content.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Comment section - only show if has access or not token gated */}
      {!isTokenGated || hasAccess ? (
        <CommentSection postId={id} />
      ) : null}
    </div>
  );
}
