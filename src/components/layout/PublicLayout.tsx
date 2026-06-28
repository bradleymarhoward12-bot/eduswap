import React from "react";
import { Navbar } from "./Navbar";

export function PublicLayout({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <Navbar />
      <main
        className={
          fullWidth ? "flex-1 pb-6" : "flex-1 pb-6 pt-2 sm:pt-3 lg:pt-4"
        }
      >
        <div className={fullWidth ? "w-full" : "app-shell"}>{children}</div>
      </main>
      <footer className="border-t border-border/70 bg-white/90 py-5 shadow-inner">
        <div className="app-shell text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EduSwap. Built for students.</p>
        </div>
      </footer>
    </div>
  );
}
