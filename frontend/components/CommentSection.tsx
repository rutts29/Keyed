"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, MessageCircle, Send } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useAddComment, useInfiniteComments } from "@/hooks/useInteractions"
import { getInitials, formatTimestamp, resolveImageUrl } from "@/lib/format"

type CommentSectionProps = {
  postId: string
}

function CommentSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

export function CommentSection({ postId }: CommentSectionProps) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteComments(postId)
  const { mutateAsync, isPending } = useAddComment(postId)
  const [text, setText] = useState("")

  const comments = useMemo(
    () => data?.pages.flatMap((page) => page.comments) ?? [],
    [data]
  )

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      toast.error("Write a comment first")
      return
    }
    try {
      await mutateAsync(trimmed)
      setText("")
      toast.success("Comment posted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment failed")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-4 w-4" />
          Comments
          {comments.length > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Add comment form */}
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            className="min-h-[80px] resize-none"
            disabled={isPending}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press Cmd+Enter to post
            </p>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
              size="sm"
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post
            </Button>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-1">
          {isLoading ? (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          ) : comments.length > 0 ? (
            <>
              {comments.map((comment) => {
                const commenterName =
                  comment.commenter?.username ?? comment.commenterWallet
                const commenterHandle = comment.commenter?.username
                  ? `@${comment.commenter.username}`
                  : comment.commenterWallet.slice(0, 8) + "..."
                const initials = getInitials(comment.commenter?.username, comment.commenterWallet)
                const avatarUrl = resolveImageUrl(
                  comment.commenter?.profileImageUri
                )

                return (
                  <div
                    key={comment.id}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <Link
                      href={`/profile/${comment.commenterWallet}`}
                      className="shrink-0"
                    >
                      <Avatar className="h-8 w-8">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt={commenterName} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/profile/${comment.commenterWallet}`}
                          className="font-medium text-sm text-foreground hover:underline"
                        >
                          {commenterName}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {commenterHandle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(comment.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Load more button */}
              {hasNextPage ? (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="text-muted-foreground"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more comments"
                    )}
                  </Button>
                </div>
              ) : comments.length > 5 ? (
                <p className="text-center text-xs text-muted-foreground pt-2">
                  No more comments
                </p>
              ) : null}

              {/* Loading skeleton for next page */}
              {isFetchingNextPage ? (
                <>
                  <CommentSkeleton />
                  <CommentSkeleton />
                </>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-foreground">
                No comments yet
              </p>
              <p className="text-xs text-muted-foreground">
                Be the first to share your thoughts
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
