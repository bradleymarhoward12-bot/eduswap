import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { ChatMessage, Conversation } from "@/types";
import {
  createChat,
  markChatAsRead,
  sendMessage as sendChatMessage,
  subscribeToChats,
  subscribeToMessages,
  type ChatParticipant,
} from "@/services/chat";
import { createTutorRequest } from "@/services/tutorRequests";
import type { TutorCourse } from "@/types";
import { db, mapChatDoc } from "@/services/firebase";
import { useAuth } from "./AuthContext";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  openChat: (
    userId: string,
    userName: string,
    course?: TutorCourse | null,
    contextListing?: { listingId: string; courseCode?: string } | null,
    initialMessage?: string,
  ) => Promise<string | null>;
  requestTutor: (
    userId: string,
    userName: string,
    course: TutorCourse,
    initialMessage?: string,
  ) => Promise<string | null>;
  openTutorRequestChat: (requestId: string) => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string) => void | Promise<void>;
  unreadCount: number;
  pendingInitialMessage: string;
  setPendingInitialMessage: (message: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [pendingInitialMessage, setPendingInitialMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setActiveChatId(null);
      setIsOpen(false);
      setPendingInitialMessage("");
      return undefined;
    }

    return subscribeToChats(user.id, setConversations);
  }, [user]);

  useEffect(() => {
    if (!user || !activeChatId) {
      setActiveConversation(null);
      setMessages([]);
      return undefined;
    }

    const nextConversation =
      conversations.find((conversation) => conversation.id === activeChatId) ??
      null;
    if (nextConversation) {
      setActiveConversation(nextConversation);
    }
    void markChatAsRead(activeChatId, user.id);

    const otherParticipant =
      nextConversation?.participants.find(
        (participant) => participant.id !== user.id,
      )?.id ?? "";

    return subscribeToMessages(
      activeChatId,
      (nextMessages) => {
        setMessages(
          nextMessages.map((message) => ({
            ...message,
            receiverId: otherParticipant || user.id,
          })),
        );
      },
      otherParticipant,
    );
  }, [activeChatId, conversations, user]);

  const openChat = async (
    targetUserId: string,
    targetUserName: string,
    course?: TutorCourse | null,
    contextListing?: { listingId: string; courseCode?: string } | null,
    initialMessage?: string,
  ) => {
    if (!user) return null;

    const normalizedInitialMessage = initialMessage?.trim() ?? "";
    setPendingInitialMessage(normalizedInitialMessage);

    const existingConversation =
      conversations.find((conversation) =>
        conversation.participants.some(
          (participant) => participant.id === targetUserId,
        ),
      ) ?? null;

    if (existingConversation) {
      if (
        contextListing &&
        (!existingConversation.contextListing ||
          existingConversation.contextListing.listingId !==
            contextListing.listingId)
      ) {
        const nextListingContext: { listingId: string; courseCode?: string } = {
          listingId: contextListing.listingId,
        };
        if (contextListing.courseCode?.trim()) {
          nextListingContext.courseCode = contextListing.courseCode.trim();
        }

        await updateDoc(doc(db, "chats", existingConversation.id), {
          contextListing: nextListingContext,
        });
      }
      setConversation(
        course && !existingConversation.contextCourse
          ? { ...existingConversation, contextCourse: course }
          : contextListing && !existingConversation.contextListing
            ? { ...existingConversation, contextListing }
            : existingConversation,
      );
      return existingConversation.id;
    }

    const targetParticipant: ChatParticipant = {
      id: targetUserId,
      fullName: targetUserName,
      name: targetUserName,
      email: "",
      avatar: "",
      initials: targetUserName.substring(0, 2).toUpperCase(),
      university: "",
      joinedAt: "",
    };

    try {
      const chatId = await createChat(
        user,
        targetParticipant,
        course,
        contextListing,
      );
      setActiveConversation({
        id: chatId,
        participants: [
          user,
          {
            id: targetParticipant.id,
            fullName: targetParticipant.fullName ?? targetParticipant.name,
            name: targetParticipant.name,
            email: targetParticipant.email ?? "",
            avatar: targetParticipant.avatar,
            initials:
              targetParticipant.initials ??
              targetParticipant.name.substring(0, 2).toUpperCase(),
            university: targetParticipant.university ?? "",
            universityCode: "",
            institutionalEmail: "",
            isVerifiedStudent: false,
            joinedAt: targetParticipant.joinedAt ?? "",
          },
        ],
        unreadCount: 0,
        contextCourse: course ?? undefined,
        contextListing: contextListing
          ? {
              listingId: contextListing.listingId,
              ...(contextListing.courseCode?.trim()
                ? { courseCode: contextListing.courseCode.trim() }
                : {}),
            }
          : undefined,
      });
      setActiveChatId(chatId);
      setIsOpen(true);
      return chatId;
    } catch (error) {
      console.error("Failed to open chat", error);
      // Provide user-friendly error handling
      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          console.warn("Permission denied opening chat - trying again");
        }
      }
      return null;
    }
  };

  const requestTutor = async (
    targetUserId: string,
    targetUserName: string,
    course: TutorCourse,
    initialMessage?: string,
  ) => {
    if (!user) return null;

    const chatId = await openChat(targetUserId, targetUserName, course);
    if (!chatId) {
      return null;
    }

    const request = await createTutorRequest({
      tutorId: targetUserId,
      studentId: user.id,
      studentName: user.fullName,
      courseCode: course.code,
      courseTitle: course.title,
      message:
        initialMessage?.trim() ||
        `This request is for ${course.code} - ${course.title}.`,
      chatId,
    });

    return request.id;
  };

  const openTutorRequestChat = async (requestId: string) => {
    if (!user) return;

    const requestSnapshot = await getDoc(doc(db, "tutorRequests", requestId));
    if (!requestSnapshot.exists()) {
      return;
    }

    const requestData = requestSnapshot.data() as Record<string, unknown>;
    const chatId =
      typeof requestData.chatId === "string" ? requestData.chatId : "";
    if (!chatId) {
      return;
    }

    const existingConversation =
      conversations.find((conversation) => conversation.id === chatId) ?? null;

    if (existingConversation) {
      setConversation(existingConversation);
      return;
    }

    const chatSnapshot = await getDoc(doc(db, "chats", chatId));
    if (!chatSnapshot.exists()) {
      return;
    }

    const conversation = mapChatDoc(
      {
        id: chatSnapshot.id,
        ...(chatSnapshot.data() as Record<string, unknown>),
      } as never,
      user.id,
    );

    setConversation(conversation);
  };

  const sendMessage = async (content: string) => {
    if (!user || !activeChatId) return;

    try {
      await sendChatMessage(activeChatId, user, content);
      setPendingInitialMessage("");
    } catch (error) {
      console.error("Failed to send chat message", error);
    }
  };

  const setConversation = (conv: Conversation | null) => {
    setActiveConversation(conv);
    setActiveChatId(conv?.id ?? null);
    if (conv) {
      setIsOpen(true);
    }
  };

  const unreadCount = conversations.reduce(
    (acc, conversation) => acc + conversation.unreadCount,
    0,
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isOpen,
        setIsOpen,
        openChat,
        requestTutor,
        openTutorRequestChat,
        setActiveConversation: setConversation,
        sendMessage,
        unreadCount,
        pendingInitialMessage,
        setPendingInitialMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
