"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { WalletButton } from "@/components/WalletButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function TopNav() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

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
        <form onSubmit={handleSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search creators, posts, or drops"
            className="h-10 pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="secondary" className="h-9" asChild>
            <Link href="/create">Create post</Link>
          </Button>
          <WalletButton />
        </div>
      </div>
    </div>
  );
}
