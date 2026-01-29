"use client";

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export function RealtimeSync() {
  useRealtimeNotifications();
  return null;
}
