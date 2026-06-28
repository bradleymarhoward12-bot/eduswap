import { useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useChat } from "@/context/ChatContext";
import { db, mapTutorRequestDoc } from "@/services/firebase";

export default function ChatPage() {
  const { conversations, setActiveConversation, setIsOpen } = useChat();
  const requestId = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("requestId") ?? "";
  }, []);

  // On the dedicated chat page, just open the floating window for now
  // In a real app, this might be a full page view, but to reuse components quickly:
  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  useEffect(() => {
    if (!requestId) {
      return undefined;
    }

    let cancelled = false;

    const openRequestedChat = async () => {
      try {
        const requestSnapshot = await getDoc(
          doc(db, "tutorRequests", requestId),
        );
        if (!requestSnapshot.exists() || cancelled) {
          return;
        }

        const request = mapTutorRequestDoc({
          id: requestSnapshot.id,
          ...(requestSnapshot.data() as Record<string, unknown>),
        } as never);

        const conversation = conversations.find(
          (entry) => entry.id === request.chatId,
        );
        if (conversation) {
          setActiveConversation(conversation);
        }
      } catch (error) {
        console.error("Failed to open chat from notification", error);
      }
    };

    void openRequestedChat();

    return () => {
      cancelled = true;
    };
  }, [conversations, requestId, setActiveConversation]);

  return (
    <div className="rounded-3xl border border-border/70 bg-card/80 px-6 py-20 text-center shadow-sm backdrop-blur">
      <h1 className="mb-4 text-3xl font-bold">Messages</h1>
      <p className="text-muted-foreground">
        Use the chat window in the bottom right to message peers.
      </p>
    </div>
  );
}
