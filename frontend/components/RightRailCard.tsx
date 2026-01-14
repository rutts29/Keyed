import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RightRailCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function RightRailCard({
  title,
  action,
  children,
  className,
}: RightRailCardProps) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-gradient-to-b from-card/80 to-card/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
