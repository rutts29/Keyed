import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Post } from "@/lib/mock-data";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{post.author.initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">
                {post.author.name}
              </span>
              <span className="text-muted-foreground">{post.author.handle}</span>
              <span className="text-muted-foreground">• {post.createdAt}</span>
              {post.topic ? (
                <Badge variant="secondary" className="text-[10px]">
                  {post.topic}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-foreground">{post.content}</p>
          </div>
        </div>
        <Separator className="bg-border/70" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.stats.replies}
          </div>
          <div className="flex items-center gap-2">
            <Repeat2 className="h-3.5 w-3.5" />
            {post.stats.reposts}
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-3.5 w-3.5" />
            {post.stats.likes}
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
