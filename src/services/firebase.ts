import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import type {
  User,
  ListingItem,
  TutorProfile,
  Conversation,
  ChatMessage,
  Notification,
  TutorReview,
  TutorCourse,
  TutorRequest,
  CourseResource,
} from "@/types";
import {
  normalizeTutorCourse,
  normalizeTutorCourses,
} from "@/utils/tutorCourses";
import { resolveListingImageUrl } from "@/utils/listingImage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

export type FirestoreTimestampLike =
  | Timestamp
  | { toDate: () => Date }
  | Date
  | string
  | number
  | null
  | undefined;

export function timestampToIso(value: FirestoreTimestampLike): string {
  if (!value) return new Date(0).toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if ("toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date(0).toISOString();
}

export function initialsFromName(name: string | undefined): string {
  const value = (name ?? "").trim();
  if (!value) return "ED";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function normalizeName(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("@")) {
    return "";
  }
  return trimmed;
}

function normalizeStringArray(values?: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function getUserFullName(
  user: Pick<User, "fullName" | "name" | "email"> | null | undefined,
): string {
  return normalizeName(user?.fullName) || normalizeName(user?.name) || "there";
}

export function getFirstNameFromFullName(
  fullName: string | undefined | null,
  fallback = "there",
): string {
  const trimmed = normalizeName(fullName ?? undefined);
  if (!trimmed || trimmed === "Tutor") {
    return fallback;
  }

  return trimmed.split(/\s+/)[0] ?? fallback;
}

export function isPlaceholderName(value: string | undefined | null): boolean {
  const trimmed = normalizeName(value ?? undefined);
  return !trimmed || trimmed === "Tutor";
}

export interface FirestoreUserDoc {
  id: string;
  email: string;
  universityCode?: string;
  institutionalEmail?: string;
  isVerifiedStudent?: boolean;
  fullName?: string;
  name?: string;
  avatar?: string;
  initials?: string;
  university?: string;
  role: string;
  createdAt: FirestoreTimestampLike;
}

export interface FirestoreListingDoc {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  images?: string[];
  sellerId: string;
  sellerName?: string;
  sellerAvatar?: string;
  category?: string;
  condition?: string;
  courseCode?: string;
  courseTitle?: string;
  relatedCourseCodes?: string[];
  tags?: string[];
  subcategory?: string;
  status?: "active" | "sold" | "inactive";
  activeOfferCount?: number;
  isAvailable?: boolean;
  interestedCount?: number;
  likesCount?: number;
  savesCount?: number;
  interestedUsers?: string[];
  latestInterestAt?: FirestoreTimestampLike;
  createdAt: FirestoreTimestampLike;
}

export interface FirestoreTutorDoc {
  id: string;
  userId: string;
  fullName?: string;
  name?: string;
  displayName?: string;
  university?: string;
  avatar?: string;
  courses?: Array<Partial<TutorCourse> | string>;
  bio: string;
  hourlyRate?: number;
  availability?: string[];
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface FirestoreChatDoc {
  id: string;
  participants: string[];
  participantDetails?: Array<
    Pick<
      User,
      | "id"
      | "fullName"
      | "name"
      | "email"
      | "avatar"
      | "initials"
      | "university"
      | "joinedAt"
    >
  >;
  contextCourse?: Partial<TutorCourse>;
  contextListing?: {
    listingId: string;
    courseCode?: string;
  };
  lastMessage?: {
    id: string;
    senderId: string;
    content: string;
    timestamp: string;
    isRead?: boolean;
  };
  unreadCounts?: Record<string, number>;
  updatedAt: FirestoreTimestampLike;
}

export interface FirestoreMessageDoc {
  id: string;
  text: string;
  senderId: string;
  type?:
    | "text"
    | "system"
    | "tutor_request"
    | "course_recommendation"
    | "marketplace_inquiry";
  requestId?: string;
  tutorId?: string;
  studentId?: string;
  studentName?: string;
  listingId?: string;
  listingTitle?: string;
  listingPrice?: number;
  courseCode?: string;
  courseTitle?: string;
  sellerName?: string;
  status?: "pending" | "accepted" | "rejected";
  message?: string;
  resources?: Array<{
    id: string;
    courseCode: string;
    title: string;
    description: string;
    type: "book" | "reviewer" | "notes";
    optionalListingId?: string;
  }>;
  createdAt: FirestoreTimestampLike;
}

export interface FirestoreCourseResourceDoc {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  type: "book" | "reviewer" | "notes";
  optionalListingId?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface FirestoreUserActivityDoc {
  id: string;
  userId: string;
  type: "view" | "save" | "offer" | "message";
  listingId: string;
  courseCode: string;
  createdAt: FirestoreTimestampLike;
}

export interface FirestoreNotificationDoc {
  id: string;
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  relatedId: string;
  isRead: boolean;
  createdAt: FirestoreTimestampLike;
}

export interface FirestoreInterestDoc {
  id: string;
  userId: string;
  targetId: string;
  type: string;
  createdAt: FirestoreTimestampLike;
  studentId?: string;
  studentName?: string;
  contextLabel?: string;
  status?: string;
  targetName?: string;
  message?: string;
  courseCode?: string;
  courseTitle?: string;
}

export interface FirestoreTutorRequestDoc {
  id: string;
  tutorId: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  message: string;
  status: TutorRequest["status"];
  chatId: string;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
}

export interface FirestoreReviewDoc {
  id: string;
  tutorId: string;
  reviewerName: string;
  reviewerInitials: string;
  rating: number;
  comment: string;
  createdAt: FirestoreTimestampLike;
}

export function mapUserDoc(
  doc: Partial<FirestoreUserDoc> & { id: string },
): User {
  const fullName =
    normalizeName(doc.fullName) || normalizeName(doc.name) || "there";
  const institutionalEmail = doc.institutionalEmail ?? doc.email ?? "";
  return {
    id: doc.id,
    email: institutionalEmail,
    fullName,
    name: fullName,
    universityCode: doc.universityCode ?? "",
    institutionalEmail,
    isVerifiedStudent: doc.isVerifiedStudent ?? false,
    avatar: doc.avatar,
    initials: doc.initials ?? initialsFromName(fullName || "User"),
    university: doc.university ?? "",
    joinedAt: timestampToIso(doc.createdAt),
  };
}

export function mapListingDoc(
  doc: Partial<FirestoreListingDoc> & { id: string },
): ListingItem {
  const imageUrl = resolveListingImageUrl({
    imageUrl: doc.imageUrl,
    images: doc.images,
    title: doc.title,
    category: doc.category,
  });
  const status = doc.status ?? (doc.isAvailable === false ? "sold" : "active");
  return {
    id: doc.id,
    title: doc.title ?? "",
    description: doc.description ?? "",
    price: doc.price ?? 0,
    category: doc.category ?? "Others",
    subcategory: doc.subcategory,
    condition: doc.condition ?? "Good",
    sellerId: doc.sellerId ?? "",
    sellerName: doc.sellerName ?? "Student Seller",
    sellerAvatar: doc.sellerAvatar,
    courseCode: doc.courseCode,
    courseTitle: doc.courseTitle,
    relatedCourseCodes: doc.relatedCourseCodes,
    tags: normalizeStringArray(doc.tags),
    status,
    activeOfferCount: doc.activeOfferCount ?? 0,
    images: normalizeStringArray([imageUrl, ...(doc.images ?? [])]),
    createdAt: timestampToIso(doc.createdAt),
    isAvailable: doc.isAvailable ?? true,
    interestedCount: doc.interestedCount ?? doc.savesCount ?? 0,
    likesCount: doc.likesCount ?? doc.interestedCount ?? doc.savesCount ?? 0,
    savesCount: doc.savesCount ?? doc.interestedCount ?? 0,
    interestedUsers: normalizeStringArray(doc.interestedUsers),
    latestInterestAt: timestampToIso(doc.latestInterestAt),
  };
}

export function mapTutorDoc(
  doc: Partial<FirestoreTutorDoc> & { id: string },
): TutorProfile {
  const fullName =
    normalizeName(doc.fullName) ||
    normalizeName(doc.displayName) ||
    normalizeName(doc.name) ||
    "Tutor";
  const courses = normalizeTutorCourses(doc.courses);

  return {
    id: doc.id,
    userId: doc.userId ?? "",
    fullName,
    name: fullName,
    displayName: normalizeName(doc.displayName) || undefined,
    university: normalizeName(doc.university) || undefined,
    avatar: doc.avatar,
    bio: doc.bio ?? "",
    courses,
    hourlyRate: doc.hourlyRate ?? 0,
    availability: doc.availability ?? [],
    rating: doc.rating ?? 0,
    reviewCount: doc.reviewCount ?? 0,
    isAvailable: doc.isAvailable ?? false,
  };
}

export function mapChatDoc(
  doc: Partial<FirestoreChatDoc> & { id: string },
  currentUserId: string,
): Conversation {
  const participantDetails = doc.participantDetails ?? [];
  const participants = doc.participants ?? [];
  const contextCourse = normalizeTutorCourse(doc.contextCourse);
  const normalizedParticipants = participants.map((participantId) => {
    const match = participantDetails.find(
      (entry) => entry.id === participantId,
    );
    if (match) {
      return mapUserDoc({
        id: match.id,
        email: match.email,
        fullName: match.fullName ?? match.name,
        name: match.name,
        avatar: match.avatar,
        initials: match.initials,
        university: match.university,
        createdAt: match.joinedAt,
        role: "student",
      });
    }
    return mapUserDoc({
      id: participantId,
      email: "",
      fullName: participantId === currentUserId ? "You" : "Participant",
      name: participantId === currentUserId ? "You" : "Participant",
      initials: participantId.slice(0, 2).toUpperCase(),
      university: "",
      createdAt: new Date(0).toISOString(),
      role: "student",
    });
  });

  const lastMessage = doc.lastMessage
    ? {
        id: doc.lastMessage.id,
        conversationId: doc.id,
        senderId: doc.lastMessage.senderId,
        receiverId:
          participants.find(
            (participantId) => participantId !== doc.lastMessage?.senderId,
          ) ?? currentUserId,
        content: doc.lastMessage.content,
        timestamp: doc.lastMessage.timestamp,
        isRead: doc.lastMessage.isRead ?? false,
      }
    : undefined;

  return {
    id: doc.id,
    participants: normalizedParticipants,
    lastMessage,
    unreadCount: doc.unreadCounts?.[currentUserId] ?? 0,
    contextCourse: contextCourse ?? undefined,
    contextListing: doc.contextListing?.listingId
      ? {
          listingId: doc.contextListing.listingId,
          courseCode: doc.contextListing.courseCode,
        }
      : undefined,
  };
}

export function mapMessageDoc(
  doc: Partial<FirestoreMessageDoc> & { id: string },
  conversationId: string,
  receiverId: string,
): ChatMessage {
  return {
    id: doc.id,
    conversationId,
    senderId: doc.senderId ?? "",
    receiverId,
    content: doc.text ?? "",
    timestamp: timestampToIso(doc.createdAt),
    isRead: true,
    type: doc.type,
    requestId: doc.requestId,
    tutorId: doc.tutorId,
    studentId: doc.studentId,
    studentName: doc.studentName,
    listingId: doc.listingId,
    listingTitle: doc.listingTitle,
    listingPrice: doc.listingPrice,
    courseCode: doc.courseCode,
    courseTitle: doc.courseTitle,
    sellerName: doc.sellerName,
    status: doc.status,
    message: doc.message,
    resources: doc.resources?.map((resource) => ({
      id: resource.id,
      courseCode: resource.courseCode,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      optionalListingId: resource.optionalListingId,
    })),
  };
}

export function mapCourseResourceDoc(
  doc: Partial<FirestoreCourseResourceDoc> & { id: string },
): CourseResource {
  return {
    id: doc.id,
    courseCode: doc.courseCode ?? "",
    title: doc.title ?? "",
    description: doc.description ?? "",
    type: doc.type ?? "notes",
    optionalListingId: doc.optionalListingId,
  };
}

export function mapTutorRequestDoc(
  doc: Partial<FirestoreTutorRequestDoc> & { id: string },
): TutorRequest {
  return {
    id: doc.id,
    tutorId: doc.tutorId ?? "",
    studentId: doc.studentId ?? "",
    studentName: doc.studentName ?? "",
    courseCode: doc.courseCode ?? "",
    courseTitle: doc.courseTitle ?? "",
    message: doc.message ?? "",
    status: doc.status ?? "pending",
    chatId: doc.chatId ?? "",
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export function mapNotificationDoc(
  doc: Partial<FirestoreNotificationDoc> & { id: string },
): Notification {
  return {
    id: doc.id,
    userId: doc.userId ?? "",
    type: doc.type ?? "message",
    title: doc.title ?? "",
    body: doc.body ?? "",
    relatedId: doc.relatedId ?? "",
    isRead: doc.isRead ?? false,
    createdAt: timestampToIso(doc.createdAt),
  };
}

export function mapInterestDoc(
  doc: Partial<FirestoreInterestDoc> & { id: string },
): FirestoreInterestDoc {
  return {
    id: doc.id,
    userId: doc.userId ?? "",
    targetId: doc.targetId ?? "",
    type: doc.type ?? "",
    createdAt: timestampToIso(doc.createdAt),
    studentId: doc.studentId,
    studentName: doc.studentName,
    contextLabel: doc.contextLabel,
    status: doc.status,
    targetName: doc.targetName,
    message: doc.message,
    courseCode: doc.courseCode,
    courseTitle: doc.courseTitle,
  };
}

export function mapReviewDoc(
  doc: Partial<FirestoreReviewDoc> & { id: string },
): TutorReview {
  return {
    id: doc.id,
    tutorId: doc.tutorId ?? "",
    reviewerName: doc.reviewerName ?? "Anonymous",
    reviewerInitials: doc.reviewerInitials ?? "AN",
    rating: doc.rating ?? 0,
    comment: doc.comment ?? "",
    createdAt: timestampToIso(doc.createdAt),
  };
}
