"use client";

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

export function WalletButton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <DynamicWidget />
    </div>
  );
}
