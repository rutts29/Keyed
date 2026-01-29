import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function TopNav() {
  return (
    <div className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <span className="text-sm font-semibold">S</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">SolShare</p>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Creator beta
            </Badge>
          </div>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" size="icon" className="h-9 w-9" asChild>
          <Link href="/create">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
