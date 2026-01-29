"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useLikePost, useUnlikePost } from "@/hooks/useInteractions"

type LikeButtonProps = {
  postId: string
  initialLiked?: boolean
  initialLikes?: number
}

export function LikeButton({
  postId,
  initialLiked = false,
  initialLikes = 0,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const { mutateAsync: likePost } = useLikePost(postId)
  const { mutateAsync: unlikePost } = useUnlikePost(postId)

  const handleClick = async () => {
    const previousLiked = isLiked
    const previousLikes = likes

    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)))

    try {
      if (nextLiked) {
        await likePost()
      } else {
        await unlikePost()
      }
    } catch (error) {
      setIsLiked(previousLiked)
      setLikes(previousLikes)
      toast.error(error instanceof Error ? error.message : "Like failed")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-2 text-xs"
      onClick={handleClick}
    >
      <Heart className={isLiked ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5"} />
      {likes}
    </Button>
  )
}
