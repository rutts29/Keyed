"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LikeButton } from "@/components/LikeButton";
import { TokenGateBadge } from "@/components/TokenGateBadge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/uiStore";
import type { FeedItem } from "@/types";
import { MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatTimestamp, resolveImageUrl } from "@/lib/format";

type PostCardProps = {
  post: FeedItem;
};

export function PostCard({ post }: PostCardProps) {
  const openTipModal = useUIStore((state) => state.openTipModal);
  const authorName = post.creator.username ?? post.creator.wallet;
  const authorHandle = post.creator.username
    ? `@${post.creator.username}`
    : post.creator.wallet;
  const initials = getInitials(post.creator.username, post.creator.wallet);
  const createdAt = formatTimestamp(post.timestamp);
  const content = post.caption ?? post.llmDescription ?? "New post";
  const tags = post.autoTags ?? [];
  const tokenGated = post.isTokenGated;
  const stats = { replies: post.comments, reposts: 0, likes: post.likes };
  const imageUrl = resolveImageUrl(post.contentUri);

  return (
    <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {authorName}
              </span>
              <span className="text-muted-foreground">{authorHandle}</span>
              <span className="text-muted-foreground">• {createdAt}</span>
              {tokenGated ? <TokenGateBadge /> : null}
            </div>
            <p className="text-sm leading-6 text-foreground">{content}</p>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 6).map((tag) => (
                  <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`}>
                    <Badge variant="outline" className="text-[10px]">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
            <img src={imageUrl} alt="" className="h-auto w-full object-cover" />
          </div>
        ) : null}
        <Separator className="bg-border/70" />
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="gap-2 text-xs" asChild>
            <Link href={`/post/${post.id}`}>
              <MessageCircle className="h-3.5 w-3.5" />
              {stats.replies}
            </Link>
          </Button>
          <LikeButton
            postId={post.id}
            initialLiked={post.isLiked ?? false}
            initialLikes={stats.likes}
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
      </CardContent>
    </Card>
  );
}
