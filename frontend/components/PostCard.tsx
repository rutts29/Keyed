import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Post as MockPost } from "@/lib/mock-data";
import type { FeedItem } from "@/types";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PostCardPost = FeedItem | MockPost;

type PostCardProps = {
  post: PostCardPost;
};

const isFeedItem = (post: PostCardPost): post is FeedItem =>
  "creator" in post;

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString();
};

const resolveImageUrl = (uri?: string | null) => {
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

export function PostCard({ post }: PostCardProps) {
  const isFeed = isFeedItem(post);
  const authorName = isFeed
    ? post.creator.username ?? post.creator.wallet
    : post.author.name;
  const authorHandle = isFeed
    ? post.creator.username
      ? `@${post.creator.username}`
      : post.creator.wallet
    : post.author.handle;
  const initials = isFeed
    ? getInitials(authorName)
    : post.author.initials;
  const createdAt = isFeed ? formatTimestamp(post.timestamp) : post.createdAt;
  const content = isFeed
    ? post.caption ?? post.llmDescription ?? "New post"
    : post.content;
  const topic = isFeed ? (post.isTokenGated ? "Token gated" : null) : post.topic;
  const stats = isFeed
    ? { replies: post.comments, reposts: 0, likes: post.likes }
    : post.stats;
  const imageUrl = isFeed ? resolveImageUrl(post.contentUri) : null;

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
              {topic ? (
                <Badge variant="secondary" className="text-[10px]">
                  {topic}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-foreground">{content}</p>
          </div>
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
            <img src={imageUrl} alt="" className="h-auto w-full object-cover" />
          </div>
        ) : null}
        <Separator className="bg-border/70" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5" />
            {stats.replies}
          </div>
          <div className="flex items-center gap-2">
            <Repeat2 className="h-3.5 w-3.5" />
            {stats.reposts}
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5" />
            {stats.likes}
          </div>
          <div className="flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
