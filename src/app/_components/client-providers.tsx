"use client";

import { TRPCReactProvider } from "~/trpc/react";
import { AdminProvider } from "./navbar";
import { Toaster } from "~/components/ui/sonner";
import { NavigationProgress } from "~/components/ui/navigation-progress";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <AdminProvider>
        <NavigationProgress />
        {children}
        <Toaster />
      </AdminProvider>
    </TRPCReactProvider>
  );
} 