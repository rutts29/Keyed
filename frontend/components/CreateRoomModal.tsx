"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRoom } from "@/hooks/useChat";
import { useChatStore } from "@/store/chatStore";
import type { ChatGateType } from "@/types";

const gateOptions: { value: ChatGateType; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "token", label: "Token Gated" },
  { value: "nft", label: "NFT Gated" },
  { value: "both", label: "Token + NFT" },
];

export function CreateRoomModal() {
  const isOpen = useChatStore((state) => state.isCreateRoomOpen);
  const closeCreateRoom = useChatStore((state) => state.closeCreateRoom);
  const { mutateAsync: createRoom, isPending } = useCreateRoom();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gateType, setGateType] = useState<ChatGateType>("open");
  const [requiredToken, setRequiredToken] = useState("");
  const [requiredNftCollection, setRequiredNftCollection] = useState("");
  const [minimumBalance, setMinimumBalance] = useState("");

  const resetState = () => {
    setName("");
    setDescription("");
    setGateType("open");
    setRequiredToken("");
    setRequiredNftCollection("");
    setMinimumBalance("");
  };

  const handleClose = () => {
    resetState();
    closeCreateRoom();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Room name is required");
      return;
    }

    try {
      await createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        gateType,
        requiredToken:
          gateType === "token" || gateType === "both"
            ? requiredToken.trim() || undefined
            : undefined,
        requiredNftCollection:
          gateType === "nft" || gateType === "both"
            ? requiredNftCollection.trim() || undefined
            : undefined,
        minimumBalance:
          minimumBalance ? Number(minimumBalance) : undefined,
      });
      toast.success("Room created");
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create room"
      );
    }
  };

  const showToken = gateType === "token" || gateType === "both";
  const showNft = gateType === "nft" || gateType === "both";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a chat room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              placeholder="e.g. Alpha Chat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-desc">Description (optional)</Label>
            <Textarea
              id="room-desc"
              placeholder="What is this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Access type</Label>
            <div className="grid grid-cols-2 gap-2">
              {gateOptions.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={gateType === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGateType(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {showToken && (
            <div className="space-y-2">
              <Label htmlFor="token-mint">Token mint address</Label>
              <Input
                id="token-mint"
                placeholder="Token mint pubkey"
                value={requiredToken}
                onChange={(e) => setRequiredToken(e.target.value)}
              />
              <div className="space-y-1">
                <Label htmlFor="min-balance">Minimum balance</Label>
                <Input
                  id="min-balance"
                  type="number"
                  placeholder="0"
                  value={minimumBalance}
                  onChange={(e) => setMinimumBalance(e.target.value)}
                />
              </div>
            </div>
          )}

          {showNft && (
            <div className="space-y-2">
              <Label htmlFor="nft-collection">NFT collection address</Label>
              <Input
                id="nft-collection"
                placeholder="Collection mint pubkey"
                value={requiredNftCollection}
                onChange={(e) => setRequiredNftCollection(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create room"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
