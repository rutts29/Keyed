import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Lock, Sparkles } from "lucide-react";

export function FeedComposer() {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="space-y-4 p-4">
        <Textarea
          placeholder="Share a creator update, drop, or thought..."
          className="min-h-[96px] resize-none bg-background/50"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              aria-label="Attach media"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Media
            </button>
            <button
              type="button"
              aria-label="Add access rules"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Lock className="h-3.5 w-3.5" />
              Gated access
            </button>
            <button
              type="button"
              aria-label="Polish with AI"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI polish
            </button>
          </div>
          <Button className="h-9 px-4 text-sm">Publish</Button>
        </div>
      </CardContent>
    </Card>
  );
}
