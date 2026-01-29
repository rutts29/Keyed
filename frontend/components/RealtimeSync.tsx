"use client";

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export function RealtimeSync() {
  const { isConnected } = useRealtimeNotifications();

  // Optional: Show a subtle connection status indicator
  // This is hidden by default but can be enabled for debugging
  const showStatusIndicator = false;

  if (!showStatusIndicator) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm"
      title={isConnected ? "Real-time sync active" : "Connecting..."}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
        }`}
      />
      <span className="text-muted-foreground">
        {isConnected ? "Live" : "Connecting"}
      </span>
    </div>
  );
}
