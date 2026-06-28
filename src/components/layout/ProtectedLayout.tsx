import React from "react";
import { Navbar } from "./Navbar";
import { useRequireAuth } from "@/utils/guards";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useRequireAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <Navbar />
      <main className="flex-1 pb-6 pt-2 sm:pt-3 lg:pt-4">
        <div className="app-shell">{children}</div>
      </main>
    </div>
  );
}
