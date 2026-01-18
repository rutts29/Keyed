import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Profile preferences
          </h1>
        </div>
        <Badge variant="secondary">Privacy ready</Badge>
      </div>
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Username</p>
            <Input placeholder="Enter a handle" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Bio</p>
            <Textarea placeholder="Share a short bio" className="min-h-[96px]" />
          </div>
          <Separator className="bg-border/70" />
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-9">Save settings</Button>
            <Button variant="secondary" className="h-9">
              Manage privacy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
