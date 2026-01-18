import { FeedComposer } from "@/components/FeedComposer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function CreatePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Create
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Publish a new post
          </h1>
        </div>
        <Badge variant="secondary">Creator tools</Badge>
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-4">
          <FeedComposer />
        </CardContent>
      </Card>
    </div>
  );
}
