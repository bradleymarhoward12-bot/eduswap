import { useChat } from "@/context/ChatContext";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatButton() {
  const { setIsOpen, isOpen, unreadCount } = useChat();

  return (
    <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50">
      <Button
        size="icon"
        className="h-13 w-13 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="btn-floating-chat"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
