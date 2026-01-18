"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAddComment, usePostComments } from "@/hooks/useInteractions"

type CommentSectionProps = {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { data, isLoading } = usePostComments(postId)
  const { mutateAsync, isPending } = useAddComment(postId)
  const [text, setText] = useState("")

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      toast.error("Write a comment first")
      return
    }
    try {
      await mutateAsync(trimmed)
      setText("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment failed")
    }
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a comment"
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isPending}>
              Post comment
            </Button>
          </div>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          {isLoading ? (
            <p>Loading comments...</p>
          ) : data?.comments?.length ? (
            data.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-border/70 p-3">
                <p className="text-foreground">
                  {comment.commenter?.username ?? comment.commenterWallet}
                </p>
                <p className="text-xs text-muted-foreground">{comment.text}</p>
              </div>
            ))
          ) : (
            <p>No comments yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
