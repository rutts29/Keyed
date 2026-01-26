"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";

import { PrivacyBalance } from "@/components/PrivacyBalance";
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
  Search,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { label: "Home", icon: Home, href: "/app" },
  { label: "Discover", icon: Zap, href: "/explore" },
  { label: "Search", icon: Search, href: "/search" },
  { label: "Notifications", icon: Bell, disabled: true, badge: "Soon" },
  { label: "Messages", icon: Mail, disabled: true, badge: "Soon" },
  { label: "Bookmarks", icon: Bookmark, disabled: true, badge: "Soon" },
  { label: "Creator Hub", icon: Gem, href: "/dashboard", badge: "New" },
  { label: "Profile", icon: User, href: "/profile/me", match: "/profile" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { handleLogOut } = useSafeDynamicContext();
  const wallet = useAuthStore((state) => state.wallet);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const profileHref = wallet ? `/profile/${wallet}` : "/profile/me";

  const handleSignOut = async () => {
    try {
      await handleLogOut();
    } catch {
      // Ignore logout errors
    }
    clearAuth();
    router.push("/");
  };

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
            const href = item.label === "Profile" ? profileHref : item.href;
            const isActive = href
              ? item.match
                ? pathname.startsWith(item.match)
                : pathname === href
              : false;
            const isDisabled = Boolean(item.disabled);
            const navClasses = cn(
              "w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0",
              isActive && "bg-muted text-foreground",
              isDisabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
            );
            const content = (
              <>
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {item.badge}
                  </Badge>
                ) : null}
              </>
            );

            return (
              <Button
                key={item.label}
                variant="ghost"
                className={navClasses}
                asChild={Boolean(href && !isDisabled)}
                disabled={isDisabled}
              >
                {href && !isDisabled ? <Link href={href}>{content}</Link> : content}
              </Button>
            );
          })}
        </nav>
        <PrivacyBalance />
        <Button className="h-11 w-full rounded-xl text-sm font-semibold" asChild>
          <Link href="/create">Post update</Link>
        </Button>
        <Separator className="bg-border/70" />
        <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Weekly creator digest
            </p>
            <Badge variant="outline" className="text-[9px]">
              Soon
            </Badge>
          </div>
          <p className="mt-1 leading-5">
            Curated threads, drop calendars, and top creators.
          </p>
          <Button variant="secondary" className="mt-3 h-8 w-full text-xs" disabled>
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
                <AvatarFallback>
                  {wallet ? wallet.slice(0, 2).toUpperCase() : "SS"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "SolShare Labs"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {wallet ? "Connected" : "@solshare"}
                </p>
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={profileHref}>View profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
