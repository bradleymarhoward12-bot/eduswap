import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  syncTutorProfileDisplayName,
  subscribeToTutorByUserId,
  upsertTutorProfile,
} from "@/services/tutors";
import { getUserFullName } from "@/services/firebase";
import { TutorProfileForm } from "@/components/dashboard/tutor/TutorProfileForm";
import { InterestTable } from "@/components/dashboard/tutor/InterestTable";
import { GraduationCap, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { TutorProfile } from "@/types";
import type { TutorProfileFormSubmitValues } from "@/components/dashboard/tutor/TutorProfileForm";

export default function MyTutorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const focusRequestId = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    return new URLSearchParams(window.location.search).get("requestId") ?? undefined;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }

    return subscribeToTutorByUserId(user.id, setProfile);
  }, [user]);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    const trimmedName = getUserFullName(user);
    const profileName = profile.fullName?.trim() || profile.displayName?.trim() || profile.name.trim();

    if (!trimmedName || trimmedName === profileName) {
      return;
    }

    if (trimmedName.includes("@")) {
      return;
    }

    void syncTutorProfileDisplayName(user.id, trimmedName);
  }, [profile, user]);

  const handleSave = async (
    data: TutorProfileFormSubmitValues & { avatar?: string },
  ) => {
    if (!user) return;

    await upsertTutorProfile({
      userId: user.id,
      fullName: getUserFullName(user),
      university: user.university,
      avatar: data.avatar ?? user.avatar,
      bio: data.bio,
      courses: data.courses,
      hourlyRate: data.hourlyRate,
      availability: data.availability,
      isAvailable: data.isAvailable,
      rating: profile?.rating ?? 0,
      reviewCount: profile?.reviewCount ?? 0,
    });

    toast({
      title: "Profile saved",
      description: "Your tutor profile has been updated.",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Tutor Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your tutoring profile and student requests.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6 border-b pb-2">
              Profile Settings
            </h2>
            <TutorProfileForm profile={profile ?? undefined} onSubmit={handleSave} />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">
              Recent Requests
            </h2>
            <div className="space-y-4">
              {!profile?.isAvailable && (
                <p className="text-sm text-muted-foreground">
                  Your profile is currently hidden, but your existing requests are still shown here.
                </p>
              )}
              <InterestTable focusRequestId={focusRequestId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
