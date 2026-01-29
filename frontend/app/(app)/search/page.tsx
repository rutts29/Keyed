"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  Hash,
  Heart,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFilters, type SearchFilter } from "@/components/SearchFilters";
import { useSemanticSearch } from "@/hooks/useSearch";
import { useTrendingTopics } from "@/hooks/useTrendingTopics";
import { useSuggestedUsers } from "@/hooks/useSuggestedUsers";
import type { UserProfile } from "@/types";
import { getInitials, formatWallet, resolveImageUrl } from "@/lib/format";

// Skeleton card for loading state
function SearchResultSkeleton() {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Creator card component
function CreatorCard({ user }: { user: UserProfile }) {
  const imageUrl = resolveImageUrl(user.profileImageUri);

  return (
    <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={user.username ?? ""} />
            ) : null}
            <AvatarFallback>
              {getInitials(user.username, user.wallet)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate text-sm">
                {user.username ?? formatWallet(user.wallet)}
              </span>
              {user.isVerified && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {user.followerCount.toLocaleString()} followers · {user.postCount} posts
            </p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0" asChild>
            <Link href={`/profile/${user.wallet}`}>View</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Tag card component
function TagCard({
  tag,
  postCount,
}: {
  tag: string;
  postCount?: number;
}) {
  return (
    <Link href={`/search?q=${encodeURIComponent(tag)}`}>
      <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-foreground">#{tag}</span>
              {postCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {postCount.toLocaleString()} posts
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Search result card with thumbnail and creator info
function SearchResultCard({
  postId,
  score,
  description,
  creatorWallet,
}: {
  postId: string;
  score: number;
  description?: string;
  creatorWallet?: string;
}) {
  const caption = description ?? "Matching post";

  // Format relevance score as percentage
  const relevancePercent = Math.round(score * 100);
  const getRelevanceColor = () => {
    if (relevancePercent >= 80) return "text-green-400";
    if (relevancePercent >= 60) return "text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <Card className="border-border/70 bg-card/70 transition-colors hover:bg-muted/60 hover:border-border hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail placeholder */}
          <div className="shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Creator info and relevance score */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {creatorWallet ? getInitials(null, creatorWallet) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {creatorWallet ? formatWallet(creatorWallet) : "Unknown"}
                  </p>
                </div>
              </div>
              {/* Relevance indicator */}
              <div
                className={`flex items-center gap-1 text-xs ${getRelevanceColor()}`}
                title={`${relevancePercent}% match`}
              >
                <Sparkles className="h-3 w-3" />
                <span>{relevancePercent}%</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground line-clamp-2">{caption}</p>

            {/* Quick actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="secondary" size="sm" className="h-7 gap-1.5" asChild>
                <Link href={`/post/${postId}`}>
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Heart className="h-3.5 w-3.5" />
                Like
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState({
  query,
  suggestedUsers,
  trendingTopics,
}: {
  query: string;
  suggestedUsers: UserProfile[];
  trendingTopics: { name: string; postCount: number; trend: string }[];
}) {
  return (
    <div className="space-y-8">
      {/* Main message */}
      <Card className="border-border/70 bg-card/70 overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {query
              ? `No results for "${query}"`
              : "Start exploring SolShare"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {query
              ? "Try different keywords, check your spelling, or explore trending topics below."
              : "Search for creators, posts, or topics to discover amazing content."}
          </p>
        </CardContent>
      </Card>

      {/* Suggested users section */}
      {suggestedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Creators to follow
            </h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedUsers.slice(0, 4).map((user) => (
              <CreatorCard key={user.wallet} user={user} />
            ))}
          </div>
        </div>
      )}

      {/* Trending topics section */}
      {trendingTopics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Trending topics
            </h4>
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {trendingTopics.slice(0, 6).map((topic) => (
              <TagCard
                key={topic.name}
                tag={topic.name}
                postCount={topic.postCount}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Loading state with skeletons
function LoadingState() {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/70">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
      {[1, 2, 3].map((i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("all");
  const { data, isLoading, isError } = useSemanticSearch(query);
  const { users: suggestedUsers } = useSuggestedUsers();
  const { topics: trendingTopics } = useTrendingTopics();

  const searchResults = useMemo(() => data?.results ?? [], [data?.results]);
  const expandedQuery = data?.expandedQuery;

  // Get result count based on filter
  const getResultCount = () => {
    switch (activeFilter) {
      case "posts":
      case "all":
        return searchResults.length;
      case "creators":
        return suggestedUsers.length;
      case "tags":
        return trendingTopics.length;
      default:
        return 0;
    }
  };

  const resultCount = getResultCount();
  const hasResults = resultCount > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Search
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {query ? `Results for "${query}"` : "Search SolShare"}
          </h1>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3 w-3" />
          Semantic search
        </Badge>
      </div>

      {/* Filters - only show when there's a query */}
      {query && (
        <SearchFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      )}

      {/* Results area */}
      <div className="space-y-4">
        {!query ? (
          // No query - show empty state with suggestions
          <EmptyState
            query=""
            suggestedUsers={suggestedUsers}
            trendingTopics={trendingTopics}
          />
        ) : isLoading ? (
          // Loading state
          <LoadingState />
        ) : !hasResults || isError ? (
          // No results found
          <EmptyState
            query={query}
            suggestedUsers={suggestedUsers}
            trendingTopics={trendingTopics}
          />
        ) : (
          // Show results
          <div className="space-y-4">
            {/* Result count */}
            <Card className="border-border/70 bg-card/70">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Found{" "}
                      <span className="font-semibold">{resultCount}</span>{" "}
                      {resultCount === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
                    </span>
                  </div>
                  {expandedQuery && expandedQuery !== query && (
                    <span className="text-xs text-muted-foreground">
                      Expanded: {expandedQuery}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results based on filter */}
            {activeFilter === "creators" ? (
              // Creator results from API
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestedUsers.map((creator) => (
                  <CreatorCard key={creator.wallet} user={creator} />
                ))}
              </div>
            ) : activeFilter === "tags" ? (
              // Tag results from API
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trendingTopics.map((topic) => (
                  <TagCard key={topic.name} tag={topic.name} postCount={topic.postCount} />
                ))}
              </div>
            ) : (
              // API search results
              searchResults.map((result) => (
                <SearchResultCard
                  key={result.postId}
                  postId={result.postId}
                  score={result.score}
                  description={result.description}
                  creatorWallet={result.creatorWallet}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Search
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Search SolShare
          </h1>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3 w-3" />
          Semantic search
        </Badge>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <LoadingState />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
