"use client"

import { Bell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Coming soon">
          <Bell className="h-4 w-4" />
          <Badge
            variant="outline"
            className="absolute -right-1 -top-1 h-4 rounded-full px-1 text-[8px]"
          >
            Soon
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
          Notifications coming soon. Real-time alerts for tips, follows, and comments.
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
