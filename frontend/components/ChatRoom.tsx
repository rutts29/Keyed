"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { ChatMessageBubble } from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatMessages, useSendMessage, useChatRealtime } from "@/hooks/useChat";
import { useAuthStore } from "@/store/authStore";

type ChatRoomProps = {
  roomId: string;
};

export function ChatRoomView({ roomId }: ChatRoomProps) {
  const wallet = useAuthStore((state) => state.wallet);
  const {
    data: messagesData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useChatMessages(roomId);
  const { mutateAsync: sendMessage, isPending: isSending } =
    useSendMessage(roomId);
  const { onlineCount } = useChatRealtime(roomId);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Flatten messages from all pages (newest first in each page)
  const messages =
    messagesData?.pages.flatMap((page) => page.messages) ?? [];

  // Memoize reversed messages to avoid re-creating array on every render
  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Auto-scroll only when a new message arrives (first page grows), not on "load older"
  const prevFirstPageLenRef = useRef(0);
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const firstPageLen = messagesData?.pages[0]?.messages.length ?? 0;
    if (firstPageLen > prevFirstPageLenRef.current) {
      scrollToBottom();
    }
    prevFirstPageLenRef.current = firstPageLen;
  }, [messagesData?.pages, scrollToBottom]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    try {
      await sendMessage(text);
    } catch {
      // Error handled by React Query
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Online indicator */}
      {onlineCount > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] text-muted-foreground border-b border-border/70">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {onlineCount} online
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4"
      >
        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}

        {/* Render messages oldest first for display */}
        {displayMessages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            isOwnMessage={msg.sender_wallet === wallet}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border/70 p-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
