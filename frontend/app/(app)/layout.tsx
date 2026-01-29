import type { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { AuthSync } from "@/components/AuthSync";
import { ClientOnly } from "@/components/ClientOnly";
import { RealtimeSync } from "@/components/RealtimeSync";
import { CreatePostModal } from "@/components/CreatePostModal";
import { SearchBar } from "@/components/SearchBar";
import { ShieldModal } from "@/components/ShieldModal";
import { SubscribeModal } from "@/components/SubscribeModal";
import { TipModal } from "@/components/TipModal";
import { SuggestedUsers } from "@/components/SuggestedUsers";
import { TopNav } from "@/components/TopNav";
import { TrendingPanel } from "@/components/TrendingPanel";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ClientOnly>
        <AuthSync />
        <RealtimeSync />
        <CreatePostModal />
        <ShieldModal />
        <TipModal />
        <SubscribeModal />
      </ClientOnly>
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4">
        <aside className="sticky top-0 hidden h-screen w-60 flex-col py-6 lg:flex">
          <ClientOnly>
            <AppSidebar />
          </ClientOnly>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col border-x border-border/70">
          <ClientOnly>
            <TopNav />
          </ClientOnly>
          <div className="flex-1 space-y-5 px-5 py-6">{children}</div>
        </div>
        <aside className="hidden w-80 flex-col gap-4 py-6 xl:flex">
          <ClientOnly>
            <SearchBar />
          </ClientOnly>
          <TrendingPanel />
          <SuggestedUsers />
        </aside>
      </div>
    </div>
  );
}
