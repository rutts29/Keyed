import type { ReactNode } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { AuthSync } from "@/components/AuthSync";
import { ClientOnly } from "@/components/ClientOnly";
import { RealtimeSync } from "@/components/RealtimeSync";
import { CreatePostModal } from "@/components/CreatePostModal";
import { RightSidebar } from "@/components/RightSidebar";
import { ShieldModal } from "@/components/ShieldModal";
import { SubscribeModal } from "@/components/SubscribeModal";
import { TipModal } from "@/components/TipModal";
import { TopNav } from "@/components/TopNav";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      {/* AuthSync must run outside the guard — it resolves authReady */}
      <ClientOnly>
        <AuthSync />
      </ClientOnly>

      <ClientOnly>
        <AuthGuard>
          <div className="min-h-screen bg-background">
            <ClientOnly>
              <RealtimeSync />
              <CreatePostModal />
              <ShieldModal />
              <TipModal />
              <SubscribeModal />
            </ClientOnly>
            <div className="mx-auto flex w-full max-w-7xl gap-6 px-4">
              <aside className="sticky top-0 hidden h-screen w-60 flex-col py-6 lg:flex">
                <AppSidebar />
              </aside>
              <div className="flex min-h-screen flex-1 flex-col border-x border-border/70">
                <TopNav />
                <div className="flex-1 space-y-5 px-5 py-6">{children}</div>
              </div>
              <RightSidebar />
            </div>
          </div>
        </AuthGuard>
      </ClientOnly>
    </>
  );
}
