"use client";

import { usePathname } from "next/navigation";

import { SearchBar } from "@/components/SearchBar";
import { SuggestedUsers } from "@/components/SuggestedUsers";
import { TrendingPanel } from "@/components/TrendingPanel";

export function RightSidebar() {
  const pathname = usePathname();
  const isSearchPage = pathname === "/search";

  return (
    <aside className="hidden w-80 flex-col gap-4 py-6 xl:flex">
      {!isSearchPage && <SearchBar />}
      <TrendingPanel />
      <SuggestedUsers />
    </aside>
  );
}
