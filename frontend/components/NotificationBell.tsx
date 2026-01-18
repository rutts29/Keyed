"use client"

import { Bell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUIStore } from "@/store/uiStore"

export function NotificationBell() {
  const count = useUIStore((state) => state.notificationsCount)
  const resetNotifications = useUIStore((state) => state.resetNotifications)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-4 rounded-full px-1 text-[9px]">
              {count > 9 ? "9+" : count}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="text-xs text-muted-foreground">
          Notifications are synced in real time.
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={resetNotifications}>
          Mark all as read
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
