import { TutorProfile } from "@/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { Star, Clock, ShieldCheck } from "lucide-react";

interface TutorCardProps {
  tutor: TutorProfile;
  onClick: () => void;
  isBlurred?: boolean;
}

export function TutorCard({
  tutor,
  onClick,
  isBlurred = false,
}: TutorCardProps) {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      onClick={onClick}
      data-testid={`tutor-card-${tutor.id}`}
    >
      {isBlurred && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/10 backdrop-blur-[3px]" />
      )}
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-3 sm:p-4">
        <Avatar className="h-10 w-10 border border-border/70">
          <AvatarImage src={tutor.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {tutor.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1 overflow-hidden">
          <h3 className="truncate text-base font-semibold leading-none text-foreground">
            {tutor.fullName || tutor.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">
              {tutor.university || "Verified university"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="mb-2 space-y-1.5">
          {tutor.courses.slice(0, 3).map((course) => (
            <div
              key={`${course.code}-${course.title}`}
              className="rounded-lg border bg-muted/20 p-2.5 space-y-1"
            >
              <Badge variant="secondary" className="text-xs font-semibold">
                {course.code}
              </Badge>
              <p className="text-sm leading-tight text-foreground">
                {course.title}
              </p>
            </div>
          ))}
          {tutor.courses.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{tutor.courses.length - 3} more courses
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/70 bg-muted/20 p-3 sm:p-4">
        <div className="space-y-0.5">
          <div className="font-bold text-primary">
            {formatCurrency(tutor.hourlyRate)}
            <span className="text-xs font-normal text-muted-foreground">
              /hr
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="font-medium text-foreground">
              {tutor.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">({tutor.reviewCount})</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{tutor.availability.length} slots</span>
        </div>
      </CardFooter>
    </Card>
  );
}
