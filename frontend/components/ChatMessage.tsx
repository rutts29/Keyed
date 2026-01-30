"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimestamp, formatWallet, getInitials, resolveImageUrl } from "@/lib/format";
import type { ChatMessage as ChatMessageType } from "@/types";

type ChatMessageProps = {
  message: ChatMessageType;
  isOwnMessage: boolean;
};

export function ChatMessageBubble({ message, isOwnMessage }: ChatMessageProps) {
  const username = message.users?.username;
  const wallet = message.sender_wallet;
  const avatarUri = message.users?.profile_image_uri;

  return (
    <div className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-7 w-7 shrink-0">
        {avatarUri && (
          <AvatarImage src={resolveImageUrl(avatarUri) ?? undefined} alt={username ?? wallet} />
        )}
        <AvatarFallback className="text-[10px]">
          {getInitials(username, wallet)}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] space-y-0.5 ${isOwnMessage ? "items-end" : ""}`}>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium">
            {username ?? formatWallet(wallet, 4)}
          </span>
          <span>{formatTimestamp(message.created_at)}</span>
        </div>
        <div
          className={`rounded-xl px-3 py-1.5 text-sm ${
            isOwnMessage
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-foreground"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
