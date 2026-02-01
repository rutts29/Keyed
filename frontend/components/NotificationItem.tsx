"use client";

import Link from "next/link";
import {
  Bell,
  Coins,
  FileText,
  Gift,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatTimestamp, formatWallet } from "@/lib/format";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

const iconMap: Record<NotificationType, typeof Heart> = {
  new_post: FileText,
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  tip: Coins,
  airdrop_received: Gift,
};

const actionText: Record<NotificationType, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  tip: "sent you a tip",
  airdrop_received: "sent you an airdrop",
  new_post: "published a new post",
};

function getHref(notification: Notification): string {
  switch (notification.type) {
    case "like":
    case "comment":
    case "new_post":
      return notification.postId ? `/post/${notification.postId}` : "/app";
    case "follow":
      return `/profile/${notification.fromWallet}`;
    case "tip":
      return "/dashboard";
    case "airdrop_received":
      return "/airdrops";
    default:
      return "/notifications";
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = iconMap[notification.type] ?? Bell;
  const action = actionText[notification.type] ?? "interacted with you";
  const href = getHref(notification);
  const displayName =
    notification.fromUser?.username ??
    formatWallet(notification.fromWallet);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  return (
    <Link href={href} onClick={handleClick} aria-label={`${displayName} ${action}`}>
      <Card
        className={`border-border/70 transition-colors hover:bg-muted/50 ${
          notification.read ? "bg-card/50" : "border-l-2 border-l-blue-500 bg-card/70"
        }`}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">{displayName}</span>{" "}
              {action}
              {notification.type === "tip" && notification.amount != null && (
                <span className="font-medium">
                  {" "}
                  of {notification.amount} SOL
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(notification.createdAt)}
            </p>
          </div>
          {!notification.read && (
            <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" role="img" aria-label="Unread" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
