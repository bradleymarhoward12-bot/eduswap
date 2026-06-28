import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { AuthModal } from "@/components/auth/AuthModal";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function SignIn() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard", { replace: true });
    }
  }, [isAuthenticated, setLocation]);

  return (
    <PublicLayout>
      <div className="py-3 sm:py-4 lg:py-5">
        <div className="mx-auto max-w-3xl surface-card p-4 md:p-6">
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sign in only when you choose an action
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  Continue to your item context
                </h1>
                <p className="text-muted-foreground">
                  You'll be returned to your dashboard after sign in.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/70 hover:bg-primary/5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to marketplace
                </Link>
                <Button onClick={() => setIsAuthModalOpen(true)}>
                  Open sign in
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">What happens next</p>
              <ul className="mt-3 space-y-2">
                <li>- Sign in once.</li>
                <li>- Return to the item you were viewing.</li>
                <li>- Message, offer, and save from the detail page.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="signin"
      />
    </PublicLayout>
  );
}
