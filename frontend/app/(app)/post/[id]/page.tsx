import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PostPageProps = {
  params: {
    id: string;
  };
};

export default function PostPage({ params }: PostPageProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Post
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Post {params.id}
          </h1>
        </div>
        <Badge variant="secondary">Token gated</Badge>
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Access check required
            </p>
            <p>
              Verify token access to unlock the full post and creator insights.
            </p>
          </div>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap items-center gap-3">
            <Button className="h-9">Verify access</Button>
            <Button variant="secondary" className="h-9">
              View creator profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
