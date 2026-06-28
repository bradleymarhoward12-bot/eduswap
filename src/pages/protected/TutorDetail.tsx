import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams, Link } from "wouter";
import {
  addTutorReview,
  subscribeToTutorById,
  subscribeToTutorReviews,
} from "@/services/tutors";
import { getCourseResources } from "@/services/recommendations";
import type { TutorProfile, TutorReview } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { usePendingAction } from "@/context/PendingActionContext";
import {
  db,
  getUserFullName,
  isPlaceholderName,
  mapUserDoc,
} from "@/services/firebase";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatTutorCourse } from "@/utils/tutorCourses";
import {
  MessageSquare,
  ArrowLeft,
  Star,
  Clock,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function isValidTutor(tutor: TutorProfile | null): tutor is TutorProfile {
  return Boolean(tutor && tutor.courses.length > 0);
}

export default function TutorDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { requestTutor } = useChat();
  const { setPendingAction } = usePendingAction();
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [resolvedTutorName, setResolvedTutorName] = useState("");
  const [reviews, setReviews] = useState<TutorReview[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestResources, setRequestResources] = useState<
    Array<{
      id: string;
      courseCode: string;
      title: string;
      description: string;
      type: "book" | "reviewer" | "notes";
      optionalListingId?: string;
    }>
  >([]);
  const [requestComplete, setRequestComplete] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    return subscribeToTutorById(id, setTutor);
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    return subscribeToTutorReviews(id, setReviews);
  }, [id]);

  useEffect(() => {
    if (!tutor) {
      setResolvedTutorName("");
      return undefined;
    }

    const fallbackName =
      tutor.fullName?.trim() || tutor.displayName?.trim() || tutor.name.trim();
    let isActive = true;

    const resolveTutorName = async () => {
      if (!isPlaceholderName(fallbackName)) {
        setResolvedTutorName(fallbackName);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", tutor.userId));
        if (!isActive) {
          return;
        }

        if (snapshot.exists()) {
          const profile = mapUserDoc({
            id: snapshot.id,
            ...(snapshot.data() as Record<string, unknown>),
          } as never);

          setResolvedTutorName(
            isPlaceholderName(profile.fullName) ? "Tutor" : profile.fullName,
          );
          return;
        }
      } catch (error) {
        console.error("Failed to resolve tutor name", error);
      }

      if (isActive) {
        setResolvedTutorName(
          isPlaceholderName(fallbackName) ? "Tutor" : fallbackName,
        );
      }
    };

    void resolveTutorName();

    return () => {
      isActive = false;
    };
  }, [tutor]);

  useEffect(() => {
    if (!tutor?.courses.length) {
      setSelectedCourseCode("");
      return;
    }

    setSelectedCourseCode((current) => current || tutor.courses[0].code);
  }, [tutor]);

  const tutorName = useMemo(() => {
    if (!tutor) return "Tutor";

    const fallbackTutorName =
      (!isPlaceholderName(tutor.fullName) && tutor.fullName) ||
      (!isPlaceholderName(tutor.displayName) && tutor.displayName) ||
      (!isPlaceholderName(tutor.name) && tutor.name) ||
      "";

    return resolvedTutorName || fallbackTutorName || "Tutor";
  }, [resolvedTutorName, tutor]);

  const tutorInitials = tutorName
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const selectedCourse =
    tutor?.courses.find((course) => course.code === selectedCourseCode) ?? null;

  if (!isValidTutor(tutor)) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Tutor not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile does not have valid course coverage.
        </p>
        <Link
          href="/tutors"
          className="mt-4 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to tutors
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === tutor.userId;
  const reviewerName = getUserFullName(user);
  const reviewerInitials = reviewerName
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newRating || !newComment.trim()) return;

    await addTutorReview({
      tutorId: tutor.id,
      reviewerName,
      reviewerInitials,
      rating: newRating,
      comment: newComment.trim(),
    });

    setNewRating(0);
    setNewComment("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleRequestTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (tutor) {
        setPendingAction({ type: "requestTutor", tutorId: tutor.userId });
      }
      setIsAuthModalOpen(true);
      return;
    }
    if (!selectedCourse) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const requestSummary = `This request is for ${formatTutorCourse(selectedCourse)}.`;
      const message = requestNote.trim()
        ? `${requestSummary}\n\n${requestNote.trim()}`
        : requestSummary;

      await requestTutor(tutor.userId, tutorName, selectedCourse, message);
      const resources = await getCourseResources(
        selectedCourse.code,
        selectedCourse.title,
      );
      setRequestResources(resources);
      setRequestComplete(true);
      setRequestNote("");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : tutor.rating;

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Link
              href="/tutors"
              className="inline-flex items-center px-0 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tutors
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Tutor Profile
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Review course coverage, availability, and student feedback
                before requesting a session.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="surface-card p-4 text-center shadow-sm sm:p-5">
            <Avatar className="h-32 w-32 mx-auto border-4 border-background shadow-md">
              <AvatarImage src={tutor.avatar} />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                {tutorInitials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2 mt-5">
              <div className="text-lg font-semibold">{tutorName}</div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>{tutor.university || "Verified university"}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium text-foreground">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({reviews.length} reviews)
                </span>
              </div>
            </div>

            <div className="mt-6 text-3xl font-bold text-primary">
              {formatCurrency(tutor.hourlyRate)}
              <span className="text-sm font-normal text-muted-foreground">
                /hr
              </span>
            </div>

            <div className="mt-6">
              {!isOwner ? (
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => setIsRequestOpen(true)}
                  data-testid="btn-request-tutor"
                >
                  <MessageSquare className="h-5 w-5" />
                  Request Tutor
                </Button>
              ) : (
                <Link
                  href="/my-tutor-profile"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border/80 bg-background px-7 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/70 hover:bg-primary/5"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>

          <div className="surface-card grid grid-cols-2 gap-3 p-3">
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Courses</p>
              <p className="mt-2 text-2xl font-semibold">
                {tutor.courses.length}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Available slots</p>
              <p className="mt-2 text-2xl font-semibold">
                {tutor.availability.length}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="surface-card space-y-4 p-4 shadow-sm sm:p-5">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Course Coverage</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subjects this tutor can help with.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {tutor.courses.map((course) => (
                  <div
                    key={`${course.code}-${course.title}`}
                    className="rounded-lg border bg-card p-4 flex flex-wrap items-start gap-3"
                  >
                    <Badge
                      variant="secondary"
                      className="px-3 py-1 text-sm font-semibold"
                    >
                      {course.code}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">
                        {course.title}
                      </p>
                      {course.grade && (
                        <p className="text-sm text-muted-foreground">
                          Grade: {course.grade}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Availability</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {tutor.availability.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                  >
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{slot}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="surface-card p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <div>
                <h2 className="text-xl font-semibold">Student Reviews</h2>
                <p className="text-sm text-muted-foreground">
                  Read feedback from students who have worked with this tutor.
                </p>
              </div>
            </div>

            {!isOwner && (
              <form
                onSubmit={handleSubmitReview}
                className="rounded-xl border bg-card p-5 mb-6 space-y-4"
              >
                <p className="text-sm font-semibold">Leave a Review</p>
                <StarPicker value={newRating} onChange={setNewRating} />
                <Textarea
                  placeholder="Share your experience with this tutor..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newRating || !newComment.trim()}
                    className="h-9 px-5 text-sm"
                  >
                    Submit Review
                  </Button>
                  {submitted && (
                    <span className="text-sm text-primary font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Review posted!
                    </span>
                  )}
                </div>
              </form>
            )}

            <div className="space-y-4">
              {reviews.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No reviews yet. Be the first!
                </p>
              )}
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border bg-card p-4 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {review.reviewerInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {review.reviewerName}
                        </span>
                        <StarDisplay rating={review.rating} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {review.createdAt}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isRequestOpen}
        onOpenChange={(open) => {
          setIsRequestOpen(open);
          if (!open) {
            setRequestComplete(false);
            setRequestResources([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {requestComplete ? "Request sent" : "Request Tutor"}
            </DialogTitle>
          </DialogHeader>

          {!requestComplete ? (
            <form onSubmit={handleRequestTutor} className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select one course</p>
                <div className="grid gap-2">
                  {tutor.courses.map((course) => {
                    const isSelected = selectedCourseCode === course.code;
                    return (
                      <button
                        key={`${course.code}-${course.title}`}
                        type="button"
                        onClick={() => setSelectedCourseCode(course.code)}
                        className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary" className="mt-0.5">
                            {course.code}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{course.title}</p>
                            {course.grade && (
                              <p className="text-xs text-muted-foreground">
                                Grade: {course.grade}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                {selectedCourse
                  ? `This request is for ${formatTutorCourse(selectedCourse)}.`
                  : "Select a course to continue."}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="request-note">
                  Optional message
                </label>
                <Textarea
                  id="request-note"
                  placeholder="Add any scheduling details or questions..."
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedCourse || isSubmittingRequest}
                  data-testid="btn-submit-tutor-request"
                >
                  {isSubmittingRequest ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border bg-primary/5 p-4">
                <p className="text-sm font-semibold">Request sent</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  While waiting, these may help.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  Recommended Learning Materials
                </p>
                <p className="text-sm text-muted-foreground">
                  Curated resources based on the subject you selected.
                </p>
              </div>

              {requestResources.length > 0 && (
                <div className="grid gap-3">
                  {requestResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="rounded-xl border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">
                            {resource.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {resource.description}
                          </p>
                        </div>
                        <Badge variant="outline">{resource.type}</Badge>
                      </div>

                      {resource.optionalListingId && (
                        <div className="mt-3">
                          <Link
                            href={`/item/${resource.optionalListingId}`}
                            className="inline-flex h-8 items-center justify-center rounded-full border border-border/80 bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/70 hover:bg-primary/5"
                          >
                            View Item
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {requestResources.length === 0 && (
                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No course resources have been seeded for this course yet.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRequestComplete(false);
                    setRequestResources([]);
                    setIsRequestOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}
