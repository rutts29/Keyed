"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSafeDynamicContext } from "@/hooks/useSafeDynamicContext";
import { Loader2 } from "lucide-react";
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
import { lamportsToSol, signAndSubmitTransaction } from "@/lib/solana";
import { useAuthStore } from "@/store/authStore";
import type { ApiResponse, TransactionResponse } from "@/types";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const BIO_MAX_LENGTH = 160;

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
  const { user, setUser } = useAuthStore();

  // Profile form state
  const { data: profileData, isLoading: isLoadingProfile } = useUserProfile(
    wallet ?? ""
  );
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUri, setProfileImageUri] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
      profileImageUri !== (profileData.profileImageUri ?? "")
    );
  }, [profileData, username, bio, profileImageUri]);

  // Check if privacy settings have unsaved changes
  const hasPrivacyChanges = useMemo(() => {
    if (!privacySettingsData) return false;
    return defaultPrivateTips !== privacySettingsData.default_private_tips;
  }, [privacySettingsData, defaultPrivateTips]);

  // Handle username change with validation
  const handleUsernameChange = useCallback((value: string) => {
    setUsername(value);
    const error = validateUsername(value);
    setUsernameError(error);
  }, []);

  // Handle bio change with length validation
  const handleBioChange = useCallback((value: string) => {
    if (value.length <= BIO_MAX_LENGTH) {
      setBio(value);
    }
  }, []);

  // Handle profile image URL change
  const handleProfileImageChange = useCallback((value: string) => {
    setProfileImageUri(value);
  }, []);

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
      const { data } = await api.post<ApiResponse<TransactionResponse>>(
        "/users/profile",
        {
          username: username || null,
          bio: bio || null,
          profileImageUri: profileImageUri || null,
        }
      );

      if (!data.data) {
        throw new Error("Profile update failed");
      }

      // If there's a transaction to sign (on-chain update)
      if (data.data.transaction && primaryWallet) {
        toast.info("Please sign the transaction to update your profile");
        try {
          await signAndSubmitTransaction(data.data.transaction, primaryWallet);
          toast.success("Profile updated on-chain");
        } catch (txError) {
          const message = txError instanceof Error ? txError.message : "Transaction failed";
          if (message.includes("cancelled") || message.includes("rejected")) {
            toast.error("Transaction signing was cancelled");
          } else {
            toast.error(`Transaction failed: ${message}`);
          }
          return;
        }
      } else {
        toast.success("Profile updated successfully");
      }

      // Update local user state
      if (user) {
        setUser({
          ...user,
          username: username || null,
          bio: bio || null,
          profileImageUri: profileImageUri || null,
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

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format wallet address for display
  const formatWallet = (address: string | null) => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Show wallet not connected state
  if (!wallet) {
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
            <Label htmlFor="profileImage" className="text-sm text-muted-foreground">
              Profile Image URL
            </Label>
            <Input
              id="profileImage"
              placeholder="https://example.com/image.jpg"
              value={profileImageUri}
              onChange={(e) => handleProfileImageChange(e.target.value)}
              disabled={isLoadingProfile || isSavingProfile}
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL for your profile image
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              className="h-9"
              onClick={handleSaveProfile}
              disabled={
                !hasProfileChanges ||
                !!usernameError ||
                isLoadingProfile ||
                isSavingProfile
              }
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
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
                  {formatWallet(wallet)}
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
                  {formatDate(profileData?.createdAt ?? user?.createdAt ?? null)}
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
                    : "Not verified"}
                </p>
              </div>
              {(profileData?.isVerified ?? user?.isVerified) ? (
                <Badge variant="secondary" className="text-[9px]">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px]">
                  Unverified
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
