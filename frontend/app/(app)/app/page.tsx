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
          emptyTitle="No posts yet."
          emptyDescription="Follow creators or publish your first update."
        />
      </div>
    </div>
  );
}
