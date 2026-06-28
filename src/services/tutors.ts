import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured, mapReviewDoc, mapTutorDoc } from "@/services/firebase";
import type { TutorCourse, TutorProfile, TutorReview } from "@/types";
import { normalizeTutorCourses } from "@/utils/tutorCourses";

export interface TutorProfileInput {
  userId: string;
  fullName: string;
  university?: string;
  avatar?: string;
  bio: string;
  courses: TutorCourse[];
  hourlyRate: number;
  availability: string[];
  isAvailable: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface TutorReviewInput {
  tutorId: string;
  reviewerName: string;
  reviewerInitials: string;
  rating: number;
  comment: string;
}

function tutorDocRef(userId: string) {
  return doc(db, "tutors", userId);
}

export function subscribeToTutors(
  callback: (tutors: TutorProfile[]) => void,
  options?: { limit?: number; onlyAvailable?: boolean },
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  const filters = [];
  if (options?.onlyAvailable) {
    filters.push(where("isAvailable", "==", true));
  }

  const base = collection(db, "tutors");
  const nextQuery =
    filters.length === 0
      ? query(base, orderBy("rating", "desc"), limit(options?.limit ?? 50))
      : options?.limit
        ? query(base, ...filters, limit(options.limit))
        : query(base, ...filters);

  return onSnapshot(nextQuery, (snapshot) => {
    const tutors = snapshot.docs
      .map((entry) =>
        mapTutorDoc({ id: entry.id, ...(entry.data() as Record<string, unknown>) } as never),
      )
      .filter((tutor) => tutor.courses.length > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    callback(options?.limit ? tutors.slice(0, options.limit) : tutors);
  }, (error) => {
    console.error("Tutors listener error", error);
    callback([]);
  });
}

export function subscribeToTutorById(
  tutorId: string,
  callback: (tutor: TutorProfile | null) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }

  return onSnapshot(doc(db, "tutors", tutorId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(mapTutorDoc({ id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as never));
  }, (error) => {
    console.error("Tutor listener error", error);
    callback(null);
  });
}

export function subscribeToTutorByUserId(
  userId: string,
  callback: (tutor: TutorProfile | null) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }

  return onSnapshot(tutorDocRef(userId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(mapTutorDoc({ id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as never));
  }, (error) => {
    console.error("Tutor profile listener error", error);
    callback(null);
  });
}

export function subscribeToTutorReviews(
  tutorId: string,
  callback: (reviews: TutorReview[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db, "tutors", tutorId, "reviews")),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((entry) => mapReviewDoc({ id: entry.id, ...(entry.data() as Record<string, unknown>) } as never))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    }, (error) => {
      console.error("Tutor reviews listener error", error);
      callback([]);
    },
  );
}

export async function upsertTutorProfile(input: TutorProfileInput): Promise<string> {
  const ref = tutorDocRef(input.userId);
  const courses = normalizeTutorCourses(input.courses);
  if (courses.length === 0) {
    throw new Error("AT_LEAST_ONE_COURSE_REQUIRED");
  }

  await setDoc(
    ref,
    {
      id: input.userId,
      userId: input.userId,
      fullName: input.fullName,
      name: input.fullName,
      displayName: input.fullName,
      university: input.university ?? "",
      avatar: input.avatar ?? "",
      bio: input.bio,
      courses,
      hourlyRate: input.hourlyRate,
      availability: input.availability,
      rating: input.rating ?? 0,
      reviewCount: input.reviewCount ?? 0,
      isAvailable: input.isAvailable,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return input.userId;
}

export async function syncTutorProfileDisplayName(
  userId: string,
  fullName: string,
): Promise<void> {
  if (!fullName.trim()) {
    return;
  }

  await setDoc(
    tutorDocRef(userId),
    {
      userId,
      fullName,
      name: fullName,
      displayName: fullName,
      university: "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function addTutorReview(input: TutorReviewInput): Promise<string> {
  const reviewRef = await addDoc(collection(db, "tutors", input.tutorId, "reviews"), {
    ...input,
    createdAt: serverTimestamp(),
  });

  await updateDoc(tutorDocRef(input.tutorId), {
    reviewCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return reviewRef.id;
}
