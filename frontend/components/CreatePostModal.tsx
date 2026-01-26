"use client"

import { useEffect, useMemo, useState } from "react"
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { signAndSubmitTransaction } from "@/lib/solana"
import { useAuthStore } from "@/store/authStore"
import { useUIStore } from "@/store/uiStore"
import type { ApiResponse, AIAnalysis, ModerationResult, TransactionResponse } from "@/types"

type UploadResponse = {
  contentUri: string
  moderationResult: ModerationResult
}

type Stage = "idle" | "uploading" | "blocked" | "preview" | "posting" | "success"

export function CreatePostModal() {
  const { primaryWallet } = useSafeDynamicContext()
  const token = useAuthStore((state) => state.token)
  const isOpen = useUIStore((state) => state.isCreatePostOpen)
  const closeCreatePost = useUIStore((state) => state.closeCreatePost)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [isTokenGated, setIsTokenGated] = useState(false)
  const [requiredToken, setRequiredToken] = useState("")
  const [stage, setStage] = useState<Stage>("idle")
  const [contentUri, setContentUri] = useState<string | null>(null)
  const [moderation, setModeration] = useState<ModerationResult | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [postId, setPostId] = useState<string | null>(null)

  const resetState = () => {
    setFile(null)
    setCaption("")
    setIsTokenGated(false)
    setRequiredToken("")
    setStage("idle")
    setContentUri(null)
    setModeration(null)
    setAiAnalysis(null)
    setPostId(null)
  }

  const handleClose = () => {
    resetState()
    closeCreatePost()
  }

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const { data } = await api.post<ApiResponse<UploadResponse>>(
        "/posts/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Upload blocked")
      }
      return data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!contentUri) {
        throw new Error("Missing upload")
      }
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/posts/create",
        {
          contentUri,
          contentType: "image",
          caption: caption || undefined,
          isTokenGated,
          requiredToken: isTokenGated ? requiredToken : undefined,
        }
      )
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Create failed")
      }
      return data.data
    },
  })

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    if (!token || !primaryWallet) {
      toast.error("Connect your wallet to post")
      return
    }

    setFile(selectedFile)
    setStage("uploading")
    try {
      const result = await uploadMutation.mutateAsync(selectedFile)
      setContentUri(result.contentUri)
      setModeration(result.moderationResult)
      setStage("preview")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
      setStage("blocked")
    }
  }

  const handleCreate = async () => {
    if (!primaryWallet) {
      toast.error("Connect your wallet to post")
      return
    }
    if (!contentUri) {
      toast.error("Upload an image first")
      return
    }
    if (isTokenGated && !requiredToken.trim()) {
      toast.error("Enter the required token mint")
      return
    }

    setStage("posting")
    try {
      const transaction = await createMutation.mutateAsync()
      setAiAnalysis(transaction.metadata?.aiAnalysis ?? null)
      setPostId(transaction.metadata?.postId ?? null)
      await signAndSubmitTransaction(transaction.transaction, primaryWallet)
      setStage("success")
      toast.success("Post published")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Post failed")
      setStage("preview")
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <Label htmlFor="upload">Upload image</Label>
            <Input
              id="upload"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleFileChange}
            />
          </div>
          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-border/70">
              <img src={previewUrl} alt="" className="h-auto w-full" />
            </div>
          ) : null}
          {stage === "uploading" ? (
            <div className="space-y-2">
              <Progress value={50} />
              <p className="text-xs text-muted-foreground">
                Uploading and moderating content...
              </p>
            </div>
          ) : null}
          {stage === "preview" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Write a caption..."
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 p-3">
                <div>
                  <Label>Token gated</Label>
                  <p className="text-xs text-muted-foreground">
                    Require token ownership to view.
                  </p>
                </div>
                <Switch
                  checked={isTokenGated}
                  onCheckedChange={setIsTokenGated}
                />
              </div>
              {isTokenGated ? (
                <div className="space-y-2">
                  <Label htmlFor="token">Required token mint</Label>
                  <Input
                    id="token"
                    value={requiredToken}
                    onChange={(event) => setRequiredToken(event.target.value)}
                    placeholder="Token mint address"
                  />
                </div>
              ) : null}
              {moderation ? (
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
                  <p className="font-semibold text-foreground">Moderation</p>
                  <p className="mt-1">
                    Verdict: {moderation.verdict.toUpperCase()}
                  </p>
                  <p className="mt-1">{moderation.explanation}</p>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  Publish
                </Button>
              </div>
            </div>
          ) : null}
          {stage === "posting" ? (
            <div className="space-y-2">
              <Progress value={80} />
              <p className="text-xs text-muted-foreground">
                Preparing on-chain transaction...
              </p>
            </div>
          ) : null}
          {stage === "success" ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground">Post published</p>
              {postId ? <p className="mt-1">Post ID: {postId}</p> : null}
              {aiAnalysis ? (
                <div className="mt-3 space-y-1">
                  <p>Description: {aiAnalysis.description}</p>
                  <p>Scene: {aiAnalysis.sceneType}</p>
                  <p>Mood: {aiAnalysis.mood}</p>
                  <p>Alt text: {aiAnalysis.altText}</p>
                  <p>Tags: {aiAnalysis.tags.join(", ")}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {postId ? (
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/post/${postId}`}>View post</Link>
                  </Button>
                ) : null}
                <Button size="sm" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
          {stage === "blocked" ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              Content blocked by moderation. Try a different image.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
