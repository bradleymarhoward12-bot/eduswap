import { useEffect, useState } from "react";
import { subscribeToListings } from "@/services/listings";
import { subscribeToTutors } from "@/services/tutors";
import { ItemGrid } from "@/components/marketplace/ItemGrid";
import { TutorGrid } from "@/components/tutors/TutorGrid";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  GraduationCap,
  ShoppingBag,
  Shield,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import type { ListingItem, TutorProfile } from "@/types";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"signin" | "signup">(
    "signup",
  );
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);

  useEffect(() => subscribeToListings(setListings, { limit: 4 }), []);
  useEffect(
    () => subscribeToTutors(setTutors, { limit: 3, onlyAvailable: true }),
    [],
  );

  const openSignup = () => {
    setAuthDefaultTab("signup");
    setIsAuthModalOpen(true);
  };
  const openSignin = () => {
    setAuthDefaultTab("signin");
    setIsAuthModalOpen(true);
  };

  const scrollDown = () => {
    document
      .getElementById("below-fold")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[88vh] w-full flex-col items-center justify-center overflow-hidden bg-white px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-16 lg:pt-10">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3 px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-5 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Campus Marketplace
          </span>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Buy, sell, and learn
            <br />
            with your campus.
          </h1>

          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            EduSwap connects students to trade textbooks, gear, and more and
            find peer tutors for any course.
          </p>

          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              className="h-11 px-6 text-sm font-semibold shadow-sm shadow-primary/20"
              onClick={openSignup}
              data-testid="btn-hero-signup"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-11 px-6 text-sm font-semibold"
              onClick={openSignin}
              data-testid="btn-hero-signin"
            >
              Sign in
            </Button>
          </div>
        </div>

        <button
          onClick={scrollDown}
          aria-label="Scroll down"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full border border-border/50 bg-white/90 px-3 py-2 text-muted-foreground shadow-sm transition-colors hover:text-primary animate-bounce"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </section>

      <div id="below-fold">
        <section className="border-y border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(240,253,244,0.8))] py-5 backdrop-blur-sm sm:py-6 lg:py-8">
          <div className="app-shell grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                icon: ShoppingBag,
                label: "Buy & Sell Items",
                desc: "Textbooks, electronics, dorm essentials",
              },
              {
                icon: GraduationCap,
                label: "Find Peer Tutors",
                desc: "Study help from top students on campus",
              },
              {
                icon: Shield,
                label: "Campus-Verified",
                desc: "Only students from your university",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="surface-card flex items-center gap-3 px-3 py-3.5 transition duration-200 hover:-translate-y-1 hover:shadow-md sm:px-4 sm:py-4"
              >
                <div className="shrink-0 rounded-2xl bg-primary/10 p-2.5 shadow-sm">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug">{label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="app-shell section-stack py-8 sm:py-10 lg:py-12">
          <section className="space-y-6">
            <div className="surface-card p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Just Listed
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Fresh listings from your campus
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Sign in to contact sellers and see full details.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 px-7 text-sm font-semibold"
                  onClick={openSignup}
                  data-testid="btn-signup-items"
                >
                  See more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <ItemGrid
              items={listings}
              onItemClick={openSignup}
              blurItems={false}
            />
          </section>

          <section className="space-y-6">
            <div className="surface-card p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Available Now
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Peer tutors ready to help
                  </h2>
                  <p className="text-base leading-7 text-muted-foreground">
                    Sign in to message tutors and book sessions.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 px-7 text-sm font-semibold"
                  onClick={openSignup}
                  data-testid="btn-signup-tutors"
                >
                  Explore tutors
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <TutorGrid
              tutors={tutors}
              onTutorClick={openSignup}
              blurItems={false}
            />
          </section>
        </div>

        <section className="border-t border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.4),rgba(240,253,244,0.82))] px-4 py-8 text-center backdrop-blur-sm sm:px-6 lg:px-8 lg:py-10">
          <div className="app-shell mx-auto max-w-2xl">
            <div className="surface-card p-6 text-center sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Get Started
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Start trading, studying, and connecting today.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Create your free account and jump into your campus community.
              </p>
              <Button
                className="mt-8 h-11 px-7 text-sm font-semibold"
                onClick={openSignup}
                data-testid="btn-bottom-signup"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}
