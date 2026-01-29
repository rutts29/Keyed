"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useFollowUser, useUnfollowUser } from "@/hooks/useInteractions"

type FollowButtonProps = {
  wallet: string
  initialFollowing?: boolean
}

export function FollowButton({
  wallet,
  initialFollowing = false,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const { mutateAsync: followUser } = useFollowUser(wallet)
  const { mutateAsync: unfollowUser } = useUnfollowUser(wallet)

  const handleClick = async () => {
    const previous = isFollowing
    const next = !isFollowing
    setIsFollowing(next)

    try {
      if (next) {
        await followUser()
      } else {
        await unfollowUser()
      }
    } catch (error) {
      setIsFollowing(previous)
      toast.error(error instanceof Error ? error.message : "Follow failed")
    }
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? "secondary" : "default"}
      className="h-9"
      onClick={handleClick}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  )
}
