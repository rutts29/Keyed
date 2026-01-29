"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, TrendingUp, X } from "lucide-react";

import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrendingTopics } from "@/hooks/useTrendingTopics";
import type { ApiResponse } from "@/types";

const RECENT_KEY = "solshare-recent-searches";
const MAX_RECENTS = 5;

type SuggestResponse = {
  suggestions: string[];
};

type SuggestionItem = {
  text: string;
  type: "recent" | "suggestion" | "trending";
};

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { topics: trendingTopics } = useTrendingTopics();

  useEffect(() => {
    return () => {
      if (suggestionsTimeout.current) {
        clearTimeout(suggestionsTimeout.current);
      }
    };
  }, []);

  const allSuggestions = useMemo((): SuggestionItem[] => {
    if (query.trim()) {
      // Show API suggestions with search icon
      return suggestions.map((text) => ({ text, type: "suggestion" as const }));
    }

    // When empty, show recent searches first, then trending topics
    const items: SuggestionItem[] = [];

    // Add recent searches
    recent.forEach((text) => {
      items.push({ text, type: "recent" as const });
    });

    // Add trending topics (limit to fill remaining space)
    const remainingSlots = Math.max(0, 5 - items.length);
    trendingTopics.slice(0, remainingSlots).forEach((topic) => {
      items.push({ text: topic.name, type: "trending" as const });
    });

    return items;
  }, [query, recent, suggestions, trendingTopics]);

  const handleSubmit = useCallback(
    (value?: string) => {
      const term = (value ?? query).trim();
      if (!term) return;
      const next = [term, ...recent.filter((item) => item !== term)].slice(
        0,
        MAX_RECENTS
      );
      setRecent(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [query, recent, router]
  );

  const handleClearRecent = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setRecent([]);
      try {
        localStorage.removeItem(RECENT_KEY);
      } catch {
        // Ignore storage errors.
      }
    },
    []
  );

  const handleRemoveRecentItem = useCallback(
    (item: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const next = recent.filter((r) => r !== item);
      setRecent(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
    },
    [recent]
  );

  const handleBlur = useCallback(() => {
    blurTimeout.current = setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
    setIsOpen(true);
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      setHighlightedIndex(-1); // Reset highlighted index when query changes
      const trimmed = value.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }
      if (suggestionsTimeout.current) {
        clearTimeout(suggestionsTimeout.current);
      }
      suggestionsTimeout.current = setTimeout(async () => {
        try {
          const { data } = await api.get<ApiResponse<SuggestResponse>>(
            "/search/suggest",
            { params: { q: trimmed } }
          );
          setSuggestions(data.data?.suggestions ?? []);
          setHighlightedIndex(-1); // Reset when new suggestions arrive
        } catch {
          setSuggestions([]);
        }
      }, 300);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen || allSuggestions.length === 0) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleSubmit();
        }
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < allSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : allSuggestions.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < allSuggestions.length) {
            handleSubmit(allSuggestions[highlightedIndex].text);
          } else {
            handleSubmit();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, allSuggestions, highlightedIndex, handleSubmit]
  );

  const getIcon = (type: SuggestionItem["type"]) => {
    switch (type) {
      case "recent":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "trending":
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const hasRecentSearches = recent.length > 0 && !query.trim();

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search creators, posts, or drops (e.g. cozy workspaces)"
        className="h-10 pl-9"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="search-suggestions"
      />
      {isOpen && allSuggestions.length > 0 ? (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute top-full z-20 mt-2 w-full rounded-xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          {/* Header for recent searches with clear all button */}
          {hasRecentSearches ? (
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Recent searches
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearRecent}
              >
                Clear all
              </Button>
            </div>
          ) : (
            <p className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {query.trim() ? "Suggestions" : "Trending topics"}
            </p>
          )}
          <div className="space-y-0.5">
            {allSuggestions
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item.type !== "trending")
              .map(({ item, index }) => (
              <button
                key={`${item.type}-${item.text}`}
                type="button"
                role="option"
                aria-selected={highlightedIndex === index}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors",
                  highlightedIndex === index
                    ? "bg-muted/80"
                    : "hover:bg-muted/60"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSubmit(item.text)}
              >
                {getIcon(item.type)}
                <span className="flex-1 truncate">{item.text}</span>
                {item.type === "recent" && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => handleRemoveRecentItem(item.text, e)}
                    aria-label={`Remove ${item.text} from recent searches`}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </button>
            ))}
          </div>
          {/* Show trending section separator if we have both recent and trending */}
          {hasRecentSearches &&
            allSuggestions.some((item) => item.type === "trending") && (
              <>
                <div className="my-2 h-px bg-border/50" />
                <p className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Trending topics
                </p>
                <div className="space-y-0.5">
                  {allSuggestions
                    .filter((item) => item.type === "trending")
                    .map((item) => {
                      const globalIndex = allSuggestions.findIndex(
                        (s) => s.type === "trending" && s.text === item.text
                      );
                      return (
                        <button
                          key={`trending-section-${item.text}`}
                          type="button"
                          role="option"
                          aria-selected={highlightedIndex === globalIndex}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors",
                            highlightedIndex === globalIndex
                              ? "bg-muted/80"
                              : "hover:bg-muted/60"
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                          onClick={() => handleSubmit(item.text)}
                        >
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{item.text}</span>
                        </button>
                      );
                    })}
                </div>
              </>
            )}
        </div>
      ) : null}
    </div>
  );
}
