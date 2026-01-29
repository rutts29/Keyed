export function resolveImageUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    const gateway =
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
      process.env.NEXT_PUBLIC_IPFS_GATEWAY;
    return gateway ? `${gateway}/${cid}` : uri;
  }
  return uri;
}

export function getInitials(name: string | null | undefined, wallet: string): string {
  if (name) {
    return name
      .split(/[\s._\-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  if (wallet === "me") return "ME";
  return wallet.slice(0, 2).toUpperCase();
}

export function formatWallet(wallet: string | null, prefixLen = 4): string {
  if (!wallet) return "Unknown";
  return `${wallet.slice(0, prefixLen)}...${wallet.slice(-4)}`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function formatCompactCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(count);
}
