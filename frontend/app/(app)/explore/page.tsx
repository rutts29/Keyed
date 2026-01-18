import { PostCard } from "@/components/PostCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { posts } from "@/lib/mock-data";

export default function ExplorePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Explore
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Trending creators and drops
          </h1>
        </div>
        <Badge variant="secondary">Live updates</Badge>
      </div>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Nothing trending yet.</p>
              <p>Check back once creators start posting.</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
