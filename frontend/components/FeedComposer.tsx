"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUIStore } from "@/store/uiStore";
import { ImagePlus, Lock, PenLine } from "lucide-react";

export function FeedComposer() {
  const openCreatePost = useUIStore((state) => state.openCreatePost);

  return (
    <Card
      className="cursor-pointer border-border/70 bg-card/70 transition-colors hover:border-border hover:bg-muted/40"
      onClick={openCreatePost}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <PenLine className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              Share a creator update, drop, or thought...
            </p>
          </div>
          <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
            <ImagePlus className="h-4 w-4" />
            <Lock className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
