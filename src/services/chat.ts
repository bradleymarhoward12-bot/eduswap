import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  db,
  isFirebaseConfigured,
  getUserFullName,
  mapChatDoc,
  mapMessageDoc,
} from "@/services/firebase";
import type { ChatMessage, Conversation, TutorCourse, User } from "@/types";
import { normalizeTutorCourse } from "@/utils/tutorCourses";

export interface ChatParticipant {
  id: string;
  fullName?: string;
  name: string;
  email?: string;
  avatar?: string;
  initials?: string;
  university?: string;
  joinedAt?: string;
}

export interface ChatRecord {
  id: string;
  participants: string[];
  participantDetails: ChatParticipant[];
  unreadCounts: Record<string, number>;
  contextCourse?: TutorCourse;
  contextListing?: {
    listingId: string;
    courseCode?: string;
  };
}

type ConversationsCallback = (conversations: Conversation[]) => void;

function chatCollection() {
  return collection(db, "chats");
}

async function findExistingChat(
  participantIds: string[],
): Promise<string | null> {
  const [first, second] = participantIds;
  if (!first || !second) return null;

  try {
    const snapshot = await getDocs(
      query(chatCollection(), where("participants", "array-contains", first)),
    );
    const existing = snapshot.docs.find((entry) => {
      const participants =
        (entry.data().participants as string[] | undefined) ?? [];
      return (
        participants.includes(first) &&
        participants.includes(second) &&
        participants.length === participantIds.length
      );
    });

    return existing?.id ?? null;
  } catch (error) {
    console.error("Chat lookup failed", error);
    return null;
  }
}

function normalizeListingContext(
  contextListing?: { listingId: string; courseCode?: string } | null,
) {
  if (!contextListing?.listingId) {
    return undefined;
  }

  const normalized: { listingId: string; courseCode?: string } = {
    listingId: contextListing.listingId,
  };
  const code = contextListing.courseCode?.trim();
  if (code) normalized.courseCode = code;
  return normalized;
}

function conversationParticipantsFromDetails(
  currentUser: User,
  target: ChatParticipant,
): ChatParticipant[] {
  const current = {
    id: currentUser.id,
    fullName: getUserFullName(currentUser),
    name: getUserFullName(currentUser),
    email: currentUser.email,
    avatar: currentUser.avatar,
    initials: currentUser.initials,
    university: currentUser.university,
    joinedAt: currentUser.joinedAt,
  };

  return [current, target];
}

function normalizeContextCourse(
  course?: TutorCourse | null,
): TutorCourse | undefined {
  return normalizeTutorCourse(course) ?? undefined;
}

export function subscribeToChats(
  userId: string,
  callback: ConversationsCallback,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(chatCollection(), where("participants", "array-contains", userId)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((entry) =>
            mapChatDoc(
              {
                id: entry.id,
                ...(entry.data() as Record<string, unknown>),
              } as never,
              userId,
            ),
          )
          .sort((a, b) => {
            const aTime = a.lastMessage?.timestamp
              ? new Date(a.lastMessage.timestamp).getTime()
              : 0;
            const bTime = b.lastMessage?.timestamp
              ? new Date(b.lastMessage.timestamp).getTime()
              : 0;
            return bTime - aTime;
          }),
      );
    },
    (error) => {
      console.error("Chats listener error", error);
      callback([]);
    },
  );
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
  receiverId = "",
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((entry) =>
          mapMessageDoc(
            {
              id: entry.id,
              ...(entry.data() as Record<string, unknown>),
            } as never,
            chatId,
            receiverId,
          ),
        ),
      );
    },
    (error) => {
      console.error("Messages listener error", error);
      callback([]);
    },
  );
}

export async function createChat(
  currentUser: User,
  target: ChatParticipant,
  contextCourse?: TutorCourse | null,
  contextListing?: { listingId: string; courseCode?: string } | null,
): Promise<string> {
  const participantIds = [currentUser.id, target.id];
  const existing = await findExistingChat(participantIds);
  if (existing) {
    return existing;
  }

  const chatRef = doc(chatCollection());
  const normalizedCourse = normalizeContextCourse(contextCourse);
  const normalizedListing = normalizeListingContext(contextListing);
  await setDoc(chatRef, {
    id: chatRef.id,
    participants: participantIds,
    participantDetails: conversationParticipantsFromDetails(
      currentUser,
      target,
    ),
    ...(normalizedCourse ? { contextCourse: normalizedCourse } : {}),
    ...(normalizedListing ? { contextListing: normalizedListing } : {}),
    unreadCounts: {
      [currentUser.id]: 0,
      [target.id]: 0,
    },
    updatedAt: serverTimestamp(),
  });

  return chatRef.id;
}

export async function sendMessage(
  chatId: string,
  sender: ChatParticipant,
  text: string,
): Promise<string> {
  const chatSnapshot = await getDoc(doc(db, "chats", chatId));
  if (!chatSnapshot.exists()) {
    throw new Error("Chat not found.");
  }

  const chatData = chatSnapshot.data() as Record<string, unknown>;
  const participants = (chatData.participants as string[] | undefined) ?? [];
  const targetId =
    participants.find((participantId) => participantId !== sender.id) ??
    sender.id;

  const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    text,
    senderId: sender.id,
    createdAt: serverTimestamp(),
  });

  const unreadCounts =
    (chatData.unreadCounts as Record<string, number> | undefined) ?? {};
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: {
      id: messageRef.id,
      senderId: sender.id,
      content: text,
      timestamp: new Date().toISOString(),
      isRead: false,
    },
    unreadCounts: {
      ...unreadCounts,
      [targetId]: (unreadCounts[targetId] ?? 0) + 1,
      [sender.id]: 0,
    },
    updatedAt: serverTimestamp(),
  });

  return messageRef.id;
}

export async function sendMarketplaceInquiry(input: {
  chatId: string;
  sender: ChatParticipant;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  courseCode?: string;
  courseTitle?: string;
  sellerName: string;
}): Promise<string> {
  const chatSnapshot = await getDoc(doc(db, "chats", input.chatId));
  if (!chatSnapshot.exists()) {
    throw new Error("Chat not found.");
  }

  const chatData = chatSnapshot.data() as Record<string, unknown>;
  const participants = (chatData.participants as string[] | undefined) ?? [];
  const targetId =
    participants.find((participantId) => participantId !== input.sender.id) ??
    input.sender.id;

  const content = `Inquiry about ${input.listingTitle}`;
  // Prevent duplicate inquiries if the last message is the same content from the same sender
  const lastMessage = chatData.lastMessage as
    | { id?: string; senderId?: string; content?: string; timestamp?: string }
    | undefined;
  if (
    lastMessage &&
    lastMessage.senderId === input.sender.id &&
    lastMessage.content === content
  ) {
    try {
      const lastTs = lastMessage.timestamp
        ? Date.parse(lastMessage.timestamp)
        : 0;
      if (Date.now() - lastTs < 10000) {
        // Consider it a duplicate send if within 10s
        return lastMessage.id ?? "";
      }
    } catch (e) {
      // ignore parse errors and continue to create message
    }
  }
  const messageRef = await addDoc(
    collection(db, "chats", input.chatId, "messages"),
    {
      text: content,
      senderId: input.sender.id,
      type: "marketplace_inquiry",
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      listingPrice: input.listingPrice,
      courseCode: input.courseCode ?? "",
      courseTitle: input.courseTitle ?? "",
      sellerName: input.sellerName,
      createdAt: serverTimestamp(),
    },
  );

  const unreadCounts =
    (chatData.unreadCounts as Record<string, number> | undefined) ?? {};
  await updateDoc(doc(db, "chats", input.chatId), {
    lastMessage: {
      id: messageRef.id,
      senderId: input.sender.id,
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
    },
    unreadCounts: {
      ...unreadCounts,
      [targetId]: (unreadCounts[targetId] ?? 0) + 1,
      [input.sender.id]: 0,
    },
    updatedAt: serverTimestamp(),
  });

  return messageRef.id;
}

export async function markChatAsRead(
  chatId: string,
  userId: string,
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`unreadCounts.${userId}`]: 0,
  });
}
