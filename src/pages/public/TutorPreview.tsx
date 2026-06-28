import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { usePendingAction } from "@/context/PendingActionContext";
import { subscribeToTutors } from "@/services/tutors";
import { TutorGrid } from "@/components/tutors/TutorGrid";
import { AuthModal } from "@/components/auth/AuthModal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, GraduationCap, BookOpen } from "lucide-react";
import type { TutorProfile } from "@/types";
import {
  filterTutorsByCourseQuery,
  hasValidCourses,
  suggestCoursesFromTutors,
} from "@/utils/tutorDiscovery";
import { formatTutorCourse } from "@/utils/tutorCourses";

export default function TutorPreview() {
  const { isAuthenticated } = useAuth();
  const { setPendingAction } = usePendingAction();
  const [, setLocation] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tutors, setTutors] = useState<TutorProfile[]>([]);

  useEffect(() => subscribeToTutors(setTutors), []);

  const visibleTutors = tutors.filter(hasValidCourses);
  const filteredTutors = searchQuery.trim()
    ? filterTutorsByCourseQuery(visibleTutors, searchQuery)
    : [...visibleTutors].sort(
        (a, b) => b.rating - a.rating || a.name.localeCompare(b.name),
      );
  const suggestedCourses = searchQuery.trim()
    ? suggestCoursesFromTutors(visibleTutors, searchQuery, 4)
    : [];

  const handleTutorClick = (tutor: TutorProfile) => {
    if (isAuthenticated) {
      setLocation(`/tutors/tutor/${tutor.id}`);
      return;
    }

    setPendingAction({ type: "viewTutor", tutorId: tutor.id });
    setIsAuthModalOpen(true);
  };

  return (
    <div className="space-y-8 py-8 lg:space-y-10 lg:py-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Peer Tutors
          </h1>
          <p className="text-muted-foreground mt-1">
            Find tutors by course code or course title.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IT 211 or Data Structures"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <TutorGrid
        tutors={filteredTutors}
        onTutorClick={handleTutorClick}
        blurItems={!isAuthenticated}
        emptyState={
          <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                No tutors found for "{searchQuery.trim()}"
              </p>
              <p className="text-sm text-muted-foreground">
                Try a course code, a course title keyword, or one of these
                nearby matches.
              </p>
            </div>
            {suggestedCourses.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedCourses.map((course) => (
                  <Badge
                    key={`${course.code}-${course.title}`}
                    variant="secondary"
                    className="px-3 py-1.5"
                  >
                    {formatTutorCourse(course)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        }
      />

      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}
