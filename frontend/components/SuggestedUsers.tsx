import { Button } from "@/components/ui/button";
import { RightRailCard } from "@/components/RightRailCard";
import type { SuggestedUser } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestedUsersProps = {
  users: SuggestedUser[];
};

export function SuggestedUsers({ users }: SuggestedUsersProps) {
  return (
    <RightRailCard title="Suggested creators">
      {users.length === 0
        ? Array.from({ length: 3 }).map((_, index) => (
            <div key={`user-skeleton-${index}`} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-8 w-16 rounded-xl" />
            </div>
          ))
        : users.map((user) => (
            <div key={user.handle} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">{user.handle}</p>
                <p className="text-xs text-muted-foreground">{user.summary}</p>
              </div>
              <Button variant="secondary" className="h-8 px-3 text-xs">
                Follow
              </Button>
            </div>
          ))}
    </RightRailCard>
  );
}
