"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  Tags,
  Zap,
} from "lucide-react";

const liveFeatures = [
  {
    title: "Creator-first monetization",
    description:
      "Run gated drops, subscriptions, and tipping without leaving the feed.",
    icon: Sparkles,
  },
  {
    title: "Token-gated access",
    description:
      "NFT passes and subscriber tiers control who sees what. Clean signal, no noise.",
    icon: Lock,
  },
  {
    title: "Instant discovery",
    description:
      "Algorithmic trends and curated rooms surface the best creators.",
    icon: Zap,
  },
  {
    title: "On-chain trust",
    description:
      "Verified creators, transparent metrics, and on-chain receipts for every transaction.",
    icon: ShieldCheck,
  },
];

const comingSoonFeatures = [
  {
    title: "Direct messages",
    description:
      "Encrypted DMs between creators and fans. Subscriber-only inboxes.",
    icon: Mail,
  },
  {
    title: "Verification badges",
    description:
      "On-chain identity verification. Prove you are who you say you are.",
    icon: BadgeCheck,
  },
  {
    title: "Creator archetypes",
    description:
      "Auto-generated profile tags based on your content style and niche.",
    icon: Tags,
  },
  {
    title: "Collaborative drops",
    description:
      "Co-create gated content with other creators. Split tips and revenue automatically on-chain.",
    icon: Zap,
  },
];

const activity = [
  "Drop preview approved for @mayastream",
  "Token-gated Q&A scheduled for tonight",
  "24 creators tipped in the last hour",
];

export default function MarketingPage() {
  const { setShowAuthFlow, primaryWallet, sdkHasLoaded } = useSafeDynamicContext();
  const [activeTab, setActiveTab] = useState<"creators" | "fans">("creators");
  const router = useRouter();

  const handleConnect = () => {
    if (primaryWallet?.address) {
      router.push("/app");
    } else {
      setShowAuthFlow(true);
    }
  };

  // Redirect to app once wallet is connected (only after SDK has loaded)
  useEffect(() => {
    if (sdkHasLoaded && primaryWallet?.address) {
      router.push("/app");
    }
  }, [primaryWallet, router, sdkHasLoaded]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <span className="text-sm font-semibold">S</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">SolShare</p>
              <p className="text-xs text-muted-foreground">
                Social layer for Solana
              </p>
            </div>
          </div>
          <Button onClick={handleConnect}>
            Connect
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-16">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              Creator beta is live
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              The minimal, premium home for Solana creators.
            </h1>
            <p className="text-base leading-7 text-muted-foreground md:text-lg">
              SolShare pairs social discovery with on-chain access. Launch gated
              drops, host private rooms, and keep your community in one
              beautifully focused feed.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div>
                <span className="text-sm font-semibold text-foreground">
                  3.2k
                </span>{" "}
                creators onboarded
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">
                  14k+
                </span>{" "}
                gated posts shipped
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">
                  $2.8m
                </span>{" "}
                tips processed
              </div>
            </div>
          </div>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">
                Creator workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full grid-cols-2 rounded-lg bg-muted/40 p-1">
                <button
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "creators"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("creators")}
                >
                  Creators
                </button>
                <button
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "fans"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("fans")}
                >
                  Fans
                </button>
              </div>
              <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
                {/* Creators panel */}
                <div className={cn("space-y-4 transition-opacity", activeTab === "creators" ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                    <p className="text-xs font-semibold text-foreground">
                      Drop overview
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Access rules, engagement, and tips in one view.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">Token gated</Badge>
                      <Badge variant="outline">142 members</Badge>
                    </div>
                  </div>
                  <Separator className="bg-border/70" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">
                      Activity feed
                    </p>
                    <div className="space-y-2">
                      {activity.map((item) => (
                        <div
                          key={item}
                          className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Fans panel */}
                <div className={cn("space-y-4 transition-opacity", activeTab === "fans" ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                    <p className="text-xs font-semibold text-foreground">
                      Fan overview
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Curated creators, live drops, and instant access checks.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">Verified</Badge>
                      <Badge variant="outline">Access unlocked</Badge>
                    </div>
                  </div>
                  <Separator className="bg-border/70" />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">
                      What you get
                    </p>
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        Jump into a live mint room in one tap.
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        Receive creator updates without the noise.
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        Unlock gated content with your tokens.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Rocket className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Live now
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                What you can do today
              </h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {liveFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-border/70 bg-card/70"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {feature.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                On the roadmap
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Coming soon
              </h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {comingSoonFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-border/50 bg-card/40"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {feature.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <Card className="border-border/70 bg-card/70">
            <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Ready to launch
                </p>
                <h3 className="text-2xl font-semibold text-foreground">
                  Ship your next creator drop in minutes.
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set your access rules, publish once, and stay connected with
                  your community.
                </p>
              </div>
              <Button className="h-11 px-6 text-sm font-semibold" onClick={handleConnect}>
                Get started
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
