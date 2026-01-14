import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Bell,
  Bookmark,
  Gem,
  Home,
  Mail,
  MoreHorizontal,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Discover", icon: Zap },
  { label: "Notifications", icon: Bell },
  { label: "Messages", icon: Mail },
  { label: "Bookmarks", icon: Bookmark },
  { label: "Creator Hub", icon: Gem, badge: "New" },
  { label: "Profile", icon: User },
  { label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <span className="text-sm font-semibold">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">SolShare</p>
            <p className="text-xs text-muted-foreground">Creator network</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
                  item.active && "bg-muted text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {item.badge}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </nav>
        <Button className="h-11 w-full rounded-xl text-sm font-semibold">
          Post update
        </Button>
        <Separator className="bg-border/70" />
        <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            Weekly creator digest
          </p>
          <p className="mt-1 leading-5">
            Curated threads, drop calendars, and top creators.
          </p>
          <Button variant="secondary" className="mt-3 h-8 w-full text-xs">
            Subscribe
          </Button>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>SS</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  SolShare Labs
                </p>
                <p className="text-xs text-muted-foreground">@solshare</p>
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem>View profile</DropdownMenuItem>
          <DropdownMenuItem>Creator settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
