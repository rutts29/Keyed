"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { PrivateTipHistory } from "@/components/PrivateTipHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  usePrivacyBalance,
  usePrivacySettings,
  useUpdatePrivacySettings,
} from "@/hooks/usePrivacy";
import { useUserProfile } from "@/hooks/useUserProfile";
import { api } from "@/lib/api";
import { lamportsToSol } from "@/lib/solana";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse } from "@/types";
import { formatWallet, resolveImageUrl, getInitials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const BIO_MAX_LENGTH = 160;

function formatDate(dateString: string | null): string {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function validateUsername(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return "Username must be at least 3 characters";
  if (value.length > 20) return "Username must be at most 20 characters";
  if (!USERNAME_REGEX.test(value)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  return null;
}

export default function SettingsPage() {
  const { primaryWallet } = useSafeDynamicContext();
  const wallet = primaryWallet?.address ?? null;
  const { user, setUser, connectedAt, authReady } = useAuthStore();

  // Profile form state
  const { data: profileData, isLoading: isLoadingProfile } = useUserProfile(
    wallet ?? ""
  );
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUri, setProfileImageUri] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Privacy settings state
  const { data: privacySettingsData, isLoading: isLoadingPrivacy } =
    usePrivacySettings();
  const { data: privacyBalanceData, isLoading: isLoadingBalance } =
    usePrivacyBalance();
  const { mutateAsync: updatePrivacySettings, isPending: isUpdatingPrivacy } =
    useUpdatePrivacySettings();
  const [defaultPrivateTips, setDefaultPrivateTips] = useState(false);

  // Initialize form with existing profile data
  useEffect(() => {
    if (profileData) {
      setUsername(profileData.username ?? "");
      setBio(profileData.bio ?? "");
      setProfileImageUri(profileData.profileImageUri ?? "");
    }
  }, [profileData]);

  // Initialize privacy settings
  useEffect(() => {
    if (privacySettingsData) {
      setDefaultPrivateTips(privacySettingsData.default_private_tips);
    }
  }, [privacySettingsData]);

  // Check if profile has unsaved changes
  const hasProfileChanges = useMemo(() => {
    if (!profileData) return false;
    return (
      username !== (profileData.username ?? "") ||
      bio !== (profileData.bio ?? "") ||
      profileImageUri !== (profileData.profileImageUri ?? "") ||
      avatarFile !== null
    );
  }, [profileData, username, bio, profileImageUri, avatarFile]);

  // Check if privacy settings have unsaved changes
  const hasPrivacyChanges = useMemo(() => {
    if (!privacySettingsData) return false;
    return defaultPrivateTips !== privacySettingsData.default_private_tips;
  }, [privacySettingsData, defaultPrivateTips]);

  // Handle username change with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const error = validateUsername(value);
    setUsernameError(error);
  };

  // Handle bio change with length validation
  const handleBioChange = (value: string) => {
    if (value.length <= BIO_MAX_LENGTH) {
      setBio(value);
    }
  };

  // Handle avatar file selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Please select a JPG, PNG, GIF, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Remove selected avatar
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileImageUri("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload avatar file and return the URI
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", avatarFile);
      const { data } = await api.post<ApiResponse<{ url: string }>>(
        "/users/profile/avatar",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data.data?.url ?? null;
    } catch (error) {
      toast.error("Failed to upload profile image");
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setUsernameError(usernameValidation);
      toast.error(usernameValidation);
      return;
    }

    setIsSavingProfile(true);
    try {
      // Upload avatar if a new file was selected
      let finalImageUri = profileImageUri || null;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          finalImageUri = uploadedUrl;
          setProfileImageUri(uploadedUrl);
          setAvatarFile(null);
          setAvatarPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }

      // Build payload, omitting empty/null fields so Zod validation passes
      const payload: Record<string, string> = {};
      if (username) payload.username = username;
      if (bio) payload.bio = bio;
      if (finalImageUri) payload.profileImageUri = finalImageUri;

      await api.post("/users/profile", payload);
      toast.success("Profile updated successfully");

      // Update local user state
      if (user) {
        setUser({
          ...user,
          username: username || user.username,
          bio: bio || user.bio,
          profileImageUri: finalImageUri || user.profileImageUri,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save privacy settings
  const handleSavePrivacy = async () => {
    try {
      await updatePrivacySettings({ defaultPrivateTips });
      toast.success("Privacy settings updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Update failed"
      );
    }
  };

  // While auth is resolving, show a loading state instead of "connect wallet"
  if (!wallet) {
    if (!authReady) {
      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Settings
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Profile preferences
            </h1>
          </div>
          <Card className="border-border/70 bg-card/70">
            <CardContent className="flex items-center gap-2 p-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading session...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

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
        </div>
        <Card className="border-border/70 bg-card/70">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Please connect your wallet to access settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          {(hasProfileChanges || hasPrivacyChanges) && (
            <Badge variant="destructive" className="text-[9px]">
              Unsaved changes
            </Badge>
          )}
          <Badge variant="secondary">Privacy ready</Badge>
        </div>
      </div>

      {/* Profile Details Section */}
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Profile details</p>
            {isLoadingProfile && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-muted-foreground">
              Username
            </Label>
            <Input
              id="username"
              placeholder="Enter a handle (3-20 characters)"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              disabled={isLoadingProfile || isSavingProfile}
              className={usernameError ? "border-destructive" : ""}
            />
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio" className="text-sm text-muted-foreground">
                Bio
              </Label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="bio"
              placeholder="Share a short bio"
              className="min-h-[96px]"
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              disabled={isLoadingProfile || isSavingProfile}
              maxLength={BIO_MAX_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Profile Photo
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  {(avatarPreview || profileImageUri) && (
                    <AvatarImage
                      src={avatarPreview ?? resolveImageUrl(profileImageUri) ?? undefined}
                      alt="Profile preview"
                    />
                  )}
                  <AvatarFallback className="text-lg">
                    {getInitials(username, wallet)}
                  </AvatarFallback>
                </Avatar>
                {(avatarPreview || profileImageUri) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/80"
                    disabled={isSavingProfile}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  disabled={isLoadingProfile || isSavingProfile}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoadingProfile || isSavingProfile}
                >
                  <Camera className="h-4 w-4" />
                  {profileImageUri || avatarPreview ? "Change Photo" : "Upload Photo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF, or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="h-9"
              onClick={handleSaveProfile}
              disabled={
                !hasProfileChanges ||
                !!usernameError ||
                isLoadingProfile ||
                isSavingProfile ||
                isUploadingAvatar
              }
            >
              {isSavingProfile || isUploadingAvatar ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploadingAvatar ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings Section */}
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Privacy preferences
              </p>
              <p className="text-xs text-muted-foreground">
                Set defaults for private tips.
              </p>
            </div>
            {isLoadingPrivacy && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Privacy Balance Display */}
          {privacyBalanceData && (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Privacy Balance
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {lamportsToSol(privacyBalanceData.shielded).toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">Shielded</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {lamportsToSol(privacyBalanceData.available).toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {lamportsToSol(privacyBalanceData.pending).toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          )}
          {isLoadingBalance && !privacyBalanceData && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

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
              disabled={isLoadingPrivacy || isUpdatingPrivacy}
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="h-9"
              onClick={handleSavePrivacy}
              disabled={!hasPrivacyChanges || isLoadingPrivacy || isUpdatingPrivacy}
            >
              {isUpdatingPrivacy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save privacy settings"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Section (Read-only) */}
      <Card className="border-border/70 bg-card/70">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm font-semibold text-foreground">Account information</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Connected Wallet
                </p>
                <p className="text-sm font-mono text-foreground">
                  {formatWallet(wallet, 6)}
                </p>
              </div>
              <Badge variant="outline" className="text-[9px]">
                Connected
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Account Created
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(profileData?.createdAt ?? user?.createdAt ?? connectedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Verification Status
                </p>
                <p className="text-sm text-foreground">
                  {profileData?.isVerified ?? user?.isVerified
                    ? "Verified"
                    : "Coming soon"}
                </p>
              </div>
              {(profileData?.isVerified ?? user?.isVerified) ? (
                <Badge variant="secondary" className="text-[9px]">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px]">
                  Coming Soon
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <PrivateTipHistory />
    </div>
  );
}
