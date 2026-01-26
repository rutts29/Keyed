"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { Toaster } from "sonner";

import { dynamicConfig } from "@/lib/dynamic";
import { createQueryClient } from "@/lib/queryClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [mounted, setMounted] = useState(false);

  // Prevent Dynamic Labs from rendering during SSR/SSG
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/SSG, render without Dynamic Labs provider
  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors />
      </QueryClientProvider>
    );
  }

  return (
    <DynamicContextProvider settings={dynamicConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors />
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
