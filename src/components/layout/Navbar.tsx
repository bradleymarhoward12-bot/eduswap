import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Store,
  User as UserIcon,
} from "lucide-react";

function PublicNavbar({
  onOpenAuthModal,
}: {
  onOpenAuthModal: (tab: "signin" | "signup") => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
      <div className="app-shell flex min-h-18 items-center justify-between gap-4 py-4 sm:min-h-20">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xl font-semibold tracking-tight text-primary transition duration-200 hover:text-primary/95"
            data-testid="link-logo"
          >
            <BookOpen className="h-6 w-6" />
            <span>EduSwap</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm font-medium text-foreground/80 md:flex" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="h-10 px-4 text-sm font-semibold"
            onClick={() => onOpenAuthModal("signin")}
            data-testid="btn-signin-nav"
          >
            Sign In
          </Button>
          <Button
            className="h-10 px-4 text-sm font-semibold"
            onClick={() => onOpenAuthModal("signup")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProtectedNavbar() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
      <div className="app-shell flex min-h-18 items-center justify-between gap-4 py-4 sm:min-h-20">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xl font-semibold tracking-tight text-primary transition duration-200 hover:text-primary/95"
            data-testid="link-logo"
          >
            <BookOpen className="h-6 w-6" />
            <span>EduSwap</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-medium text-foreground/80 lg:flex">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              href="/tutors"
              className="inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Tutors
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                data-testid="btn-user-menu"
              >
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage
                    src={user?.avatar}
                    alt={user?.fullName ?? "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.initials ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setLocation("/dashboard")}
                className="flex w-full cursor-pointer items-center"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/marketplace")}
                className="flex w-full cursor-pointer items-center"
              >
                <Store className="mr-2 h-4 w-4" />
                <span>Marketplace</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/tutors")}
                className="flex w-full cursor-pointer items-center"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Tutors</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-testid="btn-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"signin" | "signup">(
    "signin",
  );

  const openAuthModal = (tab: "signin" | "signup") => {
    setAuthDefaultTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      {isAuthenticated ? (
        <ProtectedNavbar />
      ) : (
        <PublicNavbar onOpenAuthModal={openAuthModal} />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authDefaultTab}
      />
    </>
  );
}
