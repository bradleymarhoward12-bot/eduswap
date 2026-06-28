import { useEffect, useState } from "react";
import { subscribeToTutors } from "@/services/tutors";
import { TutorGrid } from "@/components/tutors/TutorGrid";
import { useLocation } from "wouter";
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

export default function Tutors() {
  const [, setLocation] = useLocation();
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
    setLocation(`/tutors/tutor/${tutor.id}`);
  };

  return (
    <div className="space-y-2.5 lg:space-y-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 p-2.5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:p-2.75">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-[1.45rem]">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tutors Directory
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Find peer tutors by course code or course title.
          </p>
        </div>

        <div className="relative w-full md:w-68">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IT 211 or Data Structures"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-tutors-search"
          />
        </div>
      </div>

      <TutorGrid
        tutors={filteredTutors}
        onTutorClick={handleTutorClick}
        emptyState={
          <div className="rounded-xl border border-dashed bg-card px-4 py-6 text-center space-y-3 sm:px-6">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
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
    </div>
  );
}
