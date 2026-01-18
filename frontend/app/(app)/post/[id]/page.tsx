"use client";

import { CommentSection } from "@/components/CommentSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAccessVerification } from "@/hooks/useAccessVerification";

type PostPageProps = {
  params: {
    id: string;
  };
};

export default function PostPage({ params }: PostPageProps) {
  const { data, isLoading, isError } = useAccessVerification(params.id);
  const hasAccess = data?.hasAccess;

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
        <Badge variant="secondary">
          {isLoading
            ? "Checking access"
            : isError
            ? "Access unavailable"
            : hasAccess
            ? "Access verified"
            : "Token gated"}
        </Badge>
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {isLoading
                ? "Verifying access"
                : isError
                ? "Unable to verify access"
                : hasAccess
                ? "Access confirmed"
                : "Access check required"}
            </p>
            <p>
              {hasAccess
                ? "You have access to this post."
                : "Verify token access to unlock the full post and creator insights."}
            </p>
            {data?.requirements ? (
              <div className="text-xs text-muted-foreground">
                Requirements:{" "}
                {data.requirements.requiredToken
                  ? `Token ${data.requirements.requiredToken}`
                  : "Access rules on-chain"}
              </div>
            ) : null}
          </div>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap items-center gap-3">
            <Button className="h-9" disabled={isLoading || Boolean(hasAccess)}>
              Verify access
            </Button>
            <Button variant="secondary" className="h-9">
              View creator profile
            </Button>
          </div>
        </CardContent>
      </Card>
      {hasAccess ? <CommentSection postId={params.id} /> : null}
    </div>
  );
}
