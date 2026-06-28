import { TutorProfile } from "@/types";
import { TutorCard } from "./TutorCard";
import type { ReactNode } from "react";

interface TutorGridProps {
  tutors: TutorProfile[];
  onTutorClick: (tutor: TutorProfile) => void;
  blurItems?: boolean;
  emptyState?: ReactNode;
}

export function TutorGrid({
  tutors,
  onTutorClick,
  blurItems = false,
  emptyState,
}: TutorGridProps) {
  if (tutors.length === 0) {
    return (
      emptyState ?? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          <p>No tutors found.</p>
        </div>
      )
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {tutors.map((tutor) => (
        <TutorCard
          key={tutor.id}
          tutor={tutor}
          onClick={() => onTutorClick(tutor)}
          isBlurred={blurItems}
        />
      ))}
    </div>
  );
}
