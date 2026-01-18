"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { PostCard } from "@/components/PostCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSemanticSearch } from "@/hooks/useSearch";
import { posts } from "@/lib/mock-data";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const { data, isLoading, isError } = useSemanticSearch(query);
  const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL);

  const results = useMemo(() => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(lower) ||
        post.author.name.toLowerCase().includes(lower) ||
        post.author.handle.toLowerCase().includes(lower)
    );
  }, [query]);

  const showMock = !hasApi || isError;
  const searchResults = data?.results ?? [];
  const expandedQuery = data?.expandedQuery;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Search
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {query ? `Results for "${query}"` : "Search SolShare"}
          </h1>
        </div>
        <Badge variant="secondary">Semantic search</Badge>
      </div>
      <div className="space-y-4">
        {!query ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Try a prompt.</p>
              <p>Example: cozy workspaces, NFT creators, or tip drops.</p>
            </CardContent>
          </Card>
        ) : isLoading && !showMock ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Searching...</p>
              <p>Ranking posts by semantic match.</p>
            </CardContent>
          </Card>
        ) : showMock ? (
          results.length === 0 ? (
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">No matches.</p>
                <p>Try a different query or explore trending creators.</p>
              </CardContent>
            </Card>
          ) : (
            results.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : searchResults.length === 0 ? (
          <Card className="border-border/70 bg-card/70">
            <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">No matches.</p>
              <p>Try a different query or explore trending creators.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-border/70 bg-card/70">
              <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Search results
                </p>
                <p>Expanded query: {expandedQuery ?? query}</p>
              </CardContent>
            </Card>
            {searchResults.map((result) => (
              <Card key={result.postId} className="border-border/70 bg-card/70">
                <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {result.description ?? "Matching post"}
                    </p>
                    <p>Score: {result.score.toFixed(2)}</p>
                  </div>
                  <Separator className="bg-border/70" />
                  <Button variant="secondary" className="h-8" asChild>
                    <Link href={`/post/${result.postId}`}>View post</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
