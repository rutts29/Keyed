"use client";

import { useState } from "react";

import { FeedComposer } from "@/components/FeedComposer";
import { PostFeed } from "@/components/PostFeed";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AppFeedPage() {
  const [feedType, setFeedType] = useState<"personalized" | "following">(
    "personalized"
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(227,106,29,0.35)] animate-[pulse_2s_ease-in-out_infinite]" />
          Live · 32 creators
        </div>
      </div>

      <FeedComposer />

      <Tabs
        value={feedType}
        onValueChange={(value) =>
          setFeedType(value === "following" ? "following" : "personalized")
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-muted/40">
          <TabsTrigger value="personalized">For you</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
      </Tabs>

      <Separator className="bg-border/70" />

      <div className="space-y-4">
        <PostFeed
          feedType={feedType}
          showAuthNotice
          mockNotice="Set NEXT_PUBLIC_API_URL to load live data."
          emptyTitle="No posts yet."
          emptyDescription="Follow creators or publish your first update."
        />
      </div>
    </div>
  );
}
