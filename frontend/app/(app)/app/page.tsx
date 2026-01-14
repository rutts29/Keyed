import { FeedComposer } from "@/components/FeedComposer";
import { PostCard } from "@/components/PostCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { posts } from "@/lib/mock-data";

export default function AppFeedPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(227,106,29,0.35)] animate-[pulse_2s_ease-in-out_infinite]" />
          Live · 32 creators
        </div>
      </div>

      <FeedComposer />

      <Tabs defaultValue="for-you" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="for-you">For you</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
      </Tabs>

      <Separator className="bg-border/70" />

      <div className="space-y-4">
        {posts.length === 0 ? (
          <>
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">No posts yet.</p>
                <p>Follow creators or publish your first update.</p>
              </CardContent>
            </Card>
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={`feed-skeleton-${index}`} className="border-border/70 bg-card/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </div>
                  <Separator className="bg-border/70" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
