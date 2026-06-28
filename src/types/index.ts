export interface User {
  id: string;
  fullName: string;
  name: string;
  email: string;
  universityCode: string;
  institutionalEmail: string;
  isVerifiedStudent: boolean;
  avatar?: string;
  initials: string;
  university: string;
  joinedAt: string;
}

export type UserProfile = User;

export interface ListingItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  condition: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  courseCode?: string;
  courseTitle?: string;
  relatedCourseCodes?: string[];
  tags?: string[];
  status?: "active" | "sold" | "inactive";
  activeOfferCount?: number;
  images: string[];
  createdAt: string;
  isAvailable: boolean;
  interestedCount: number;
  likesCount?: number;
  savesCount?: number;
  interestedUsers?: string[];
  latestInterestAt?: string;
}

export type ListingInterestType = "save" | "offer" | "message" | "view";
export type ListingOfferStatus = "pending" | "accepted" | "rejected";

export interface ListingInterestRecord {
  id: string;
  listingId: string;
  sellerId: string;
  userId: string;
  type: ListingInterestType;
  createdAt: string;
  offerAmount?: number;
  message?: string;
  status?: ListingOfferStatus;
  listingTitle?: string;
  listingPrice?: number;
  sellerName?: string;
  buyerName?: string;
}

export interface ListingInterestInput {
  listingId: string;
  sellerId: string;
  userId: string;
  type: ListingInterestType;
  offerAmount?: number;
  message?: string;
  status?: ListingOfferStatus;
  listingTitle?: string;
  listingPrice?: number;
  sellerName?: string;
  buyerName?: string;
}

export interface ListingOfferInput extends ListingInterestInput {}

export interface ListingInterestSummaryEntry {
  listingId: string;
  saves: number;
  offers: number;
  messages: number;
  views: number;
  latestInteraction?: ListingInterestRecord;
}

export interface ListingInterestSummary {
  [listingId: string]: ListingInterestSummaryEntry;
}

export type PendingMarketplaceActionType = "save" | "offer" | "message";

export interface PendingMarketplaceAction {
  type: PendingMarketplaceActionType;
  listingId: string;
  offerAmount?: number;
  message?: string;
}

export interface PendingTutorViewAction {
  type: "viewTutor";
  tutorId: string;
}

export interface PendingTutorRequestAction {
  type: "requestTutor";
  tutorId: string;
}

export type PendingAction =
  | PendingMarketplaceAction
  | PendingTutorViewAction
  | PendingTutorRequestAction;

export interface TutorCourse {
  code: string;
  title: string;
  grade?: string;
}

export interface TutorProfile {
  id: string;
  userId: string;
  fullName?: string;
  name: string;
  displayName?: string;
  university?: string;
  avatar?: string;
  bio: string;
  courses: TutorCourse[];
  hourlyRate: number;
  availability: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  isRead: boolean;
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
  resources?: CourseResource[];
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  contextCourse?: TutorCourse;
  contextListing?: {
    listingId: string;
    courseCode?: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: "interest" | "message" | "chat";
  title: string;
  body: string;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

export interface TutorReview {
  id: string;
  tutorId: string;
  reviewerName: string;
  reviewerInitials: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TutorRequest {
  id: string;
  tutorId: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  chatId: string;
  createdAt: string;
  updatedAt: string;
}

export type CourseResourceType = "book" | "reviewer" | "notes";

export interface CourseResource {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  type: CourseResourceType;
  optionalListingId?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: "view" | "save" | "offer" | "message";
  listingId: string;
  courseCode: string;
  createdAt: string;
}
