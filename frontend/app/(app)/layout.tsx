import type { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { AuthSync } from "@/components/AuthSync";
import { RealtimeSync } from "@/components/RealtimeSync";
import { CreatePostModal } from "@/components/CreatePostModal";
import { RightRailCard } from "@/components/RightRailCard";
import { ShieldModal } from "@/components/ShieldModal";
import { SubscribeModal } from "@/components/SubscribeModal";
import { TipModal } from "@/components/TipModal";
import { SuggestedUsers } from "@/components/SuggestedUsers";
import { TopNav } from "@/components/TopNav";
import { TrendingPanel } from "@/components/TrendingPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AuthSync />
      <RealtimeSync />
      <CreatePostModal />
      <ShieldModal />
      <TipModal />
      <SubscribeModal />
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4">
        <aside className="sticky top-0 hidden h-screen w-60 flex-col py-6 lg:flex">
          <AppSidebar />
        </aside>
        <div className="flex min-h-screen flex-1 flex-col border-x border-border/70">
          <TopNav />
          <div className="flex-1 space-y-5 px-4 py-6">{children}</div>
        </div>
        <aside className="sticky top-0 hidden h-screen w-80 flex-col gap-4 py-6 xl:flex">
          <RightRailCard
            title="Quick actions"
            action={
              <Badge variant="outline" className="text-[9px]">
                Soon
              </Badge>
            }
          >
            <div className="space-y-2 text-xs">
              <p className="text-sm font-semibold text-foreground">
                Launch a gated drop
              </p>
              <p className="text-muted-foreground">
                Set access rules, preview the post, and publish in minutes.
              </p>
              <Button className="h-8 w-full text-xs" disabled>
                Create drop
              </Button>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Creator spotlight
              </div>
              <p className="mt-1">
                Apply to be featured in next week&apos;s community spotlight.
              </p>
              <Button variant="secondary" className="mt-3 h-8 w-full text-xs" disabled>
                Apply now
              </Button>
            </div>
          </RightRailCard>
          <TrendingPanel />
          <SuggestedUsers />
        </aside>
      </div>
    </div>
  );
}
