"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PrivateTipHistory } from "@/components/PrivateTipHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePrivacySettings, useUpdatePrivacySettings } from "@/hooks/usePrivacy";

export default function SettingsPage() {
  const { data } = usePrivacySettings();
  const { mutateAsync, isPending } = useUpdatePrivacySettings();
  const [defaultPrivateTips, setDefaultPrivateTips] = useState(false);

  useEffect(() => {
    if (data) {
      setDefaultPrivateTips(data.default_private_tips);
    }
  }, [data]);

  const handleSavePrivacy = async () => {
    try {
      await mutateAsync({ defaultPrivateTips });
      toast.success("Privacy settings updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Update failed"
      );
    }
  };

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
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Privacy preferences
            </p>
            <p className="text-xs text-muted-foreground">
              Set defaults for private tips.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
            <div>
              <Label>Default private tips</Label>
              <p className="text-xs text-muted-foreground">
                Enable private tips by default.
              </p>
            </div>
            <Switch
              checked={defaultPrivateTips}
              onCheckedChange={setDefaultPrivateTips}
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="h-9"
              onClick={handleSavePrivacy}
              disabled={isPending}
            >
              Save privacy settings
            </Button>
          </div>
        </CardContent>
      </Card>
      <PrivateTipHistory />
    </div>
  );
}
