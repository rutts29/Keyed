"use client";

import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/uiStore";
import { posts } from "@/lib/mock-data";

type ProfilePageProps = {
  params: {
    wallet: string;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const openSubscribeModal = useUIStore((state) => state.openSubscribeModal);
  const isSelf = params.wallet === "me";

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Profile
              </p>
              <h1 className="text-2xl font-semibold text-foreground">
                {params.wallet === "me" ? "Your profile" : params.wallet}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              {isSelf ? (
                <Button variant="secondary" className="h-9" disabled>
                  This is you
                </Button>
              ) : (
                <>
                  <FollowButton wallet={params.wallet} />
                  <Button
                    variant="secondary"
                    className="h-9"
                    onClick={() => openSubscribeModal(params.wallet)}
                  >
                    Subscribe
                  </Button>
                </>
              )}
            </div>
          </div>
          <Separator className="bg-border/70" />
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Followers</p>
              <p className="text-lg font-semibold text-foreground">3.2k</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Following</p>
              <p className="text-lg font-semibold text-foreground">210</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Posts</p>
              <p className="text-lg font-semibold text-foreground">128</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
