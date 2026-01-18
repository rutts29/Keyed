"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { Toaster } from "sonner";

import { dynamicConfig } from "@/lib/dynamic";
import { createQueryClient } from "@/lib/queryClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <DynamicContextProvider settings={dynamicConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors />
      </QueryClientProvider>
    </DynamicContextProvider>
  );
}
