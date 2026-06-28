import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import {
  MessageCircle,
  X,
  Send,
  ChevronLeft,
  Check,
  ExternalLink,
  Copy,
  Check as CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatTutorCourse } from "@/utils/tutorCourses";
import { updateTutorRequestStatus } from "@/services/tutorRequests";
import { getRelatedListings } from "@/services/recommendations";
import { formatCurrency } from "@/utils/formatCurrency";
import type { ListingItem } from "@/types";
import { Link } from "wouter";

export function ChatWindow() {
  const {
    isOpen,
    setIsOpen,
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    pendingInitialMessage,
    setPendingInitialMessage,
  } = useChat();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const [marketplaceRecommendations, setMarketplaceRecommendations] = useState<
    ListingItem[]
  >([]);
  const [showMarketplaceRecommendations, setShowMarketplaceRecommendations] =
    useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (!viewportRef.current) return;

    requestAnimationFrame(() => {
      if (!viewportRef.current) return;
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior,
      });
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || !activeConversation) {
      return;
    }

    // mark that the chat was just opened so initial scroll can jump (no animation)
    justOpenedRef.current = true;
    scrollToBottom("auto");
  }, [isOpen, activeConversation?.id]);

  useLayoutEffect(() => {
    if (!isOpen || !activeConversation || messages.length === 0) {
      return;
    }

    // If we just opened the chat, jump to bottom without animation; otherwise smooth scroll
    const behavior: ScrollBehavior = justOpenedRef.current ? "auto" : "smooth";
    scrollToBottom(behavior);
    justOpenedRef.current = false;
  }, [isOpen, activeConversation?.id, messages.length]);

  useEffect(() => {
    if (!isOpen || !pendingInitialMessage || newMessage) {
      return;
    }

    setNewMessage(pendingInitialMessage);
  }, [isOpen, pendingInitialMessage, newMessage]);

  useEffect(() => {
    if (
      !activeConversation?.contextListing?.listingId ||
      !activeConversation.contextListing.courseCode
    ) {
      setMarketplaceRecommendations([]);
      setShowMarketplaceRecommendations(false);
      return undefined;
    }

    let cancelled = false;
    void getRelatedListings({
      currentListingId: activeConversation.contextListing.listingId,
      courseCode: activeConversation.contextListing.courseCode,
    }).then((items) => {
      if (!cancelled) {
        setMarketplaceRecommendations(items);
      }
    });

    setShowMarketplaceRecommendations(false);

    return () => {
      cancelled = true;
    };
  }, [
    activeConversation?.contextListing?.listingId,
    activeConversation?.contextListing?.courseCode,
  ]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      (async () => {
        setIsSending(true);
        try {
          await sendMessage(newMessage.trim());
          setNewMessage("");
          setPendingInitialMessage("");
          setIsTyping(false);
          if (activeConversation?.contextListing?.listingId) {
            setShowMarketplaceRecommendations(true);
          }
        } finally {
          setIsSending(false);
        }
      })();
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    setIsTyping(value.length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const getOtherParticipant = (conv: any) =>
    conv.participants.find((p: any) => p.id !== user?.id) ||
    conv.participants[0];

  const renderTutorRequestCard = (msg: any, isMine: boolean) => {
    const isTutorActionable = msg.tutorId && msg.tutorId === user?.id;

    return (
      <div
        className={`max-w-[88%] sm:max-w-[78%] md:max-w-[68%] rounded-2xl border p-3 shadow-sm ${isMine ? "ml-auto bg-background border-primary/20" : "bg-background"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{msg.studentName}</p>
            <p className="text-xs text-muted-foreground">
              {formatTutorCourse({
                code: msg.courseCode,
                title: msg.courseTitle,
              })}
            </p>
          </div>
          <Badge
            variant={
              msg.status === "accepted"
                ? "default"
                : msg.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {msg.status ?? "pending"}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word">
          {msg.message || msg.content}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setActiveConversation(null);
              setIsOpen(false);
              setLocation(`/tutor/requests?requestId=${msg.requestId}`);
            }}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            View Details
          </Button>
          {isTutorActionable && msg.status === "pending" && (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={async () => {
                  if (msg.requestId) {
                    await updateTutorRequestStatus(msg.requestId, "accepted");
                  }
                }}
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={async () => {
                  if (msg.requestId) {
                    await updateTutorRequestStatus(msg.requestId, "rejected");
                  }
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderCourseRecommendationCard = (msg: any) => {
    const resources = Array.isArray(msg.resources) ? msg.resources : [];

    return (
      <div className="max-w-[92%] sm:max-w-[84%] md:max-w-[72%] rounded-2xl border p-4 shadow-sm bg-background border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {msg.courseCode || "Course resources"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              While waiting, these may help
            </p>
          </div>
          <Badge variant="secondary">Resources</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {resources.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
              No course resources have been seeded for this course yet.
            </div>
          ) : (
            resources.map((resource: any) => (
              <div
                key={resource.id}
                className="rounded-xl border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {resource.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">
                      {resource.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {resource.type}
                  </Badge>
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
            ))
          )}
        </div>
      </div>
    );
  };

  const renderMarketplaceInquiryCard = (msg: any) => {
    return (
      <div className="max-w-[88%] sm:max-w-[78%] md:max-w-[68%] rounded-2xl border p-4 shadow-sm bg-background border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {msg.listingTitle || "Marketplace inquiry"}
            </p>
            <p className="text-xs text-muted-foreground">
              {msg.courseCode || "Course context"}{" "}
              {msg.courseTitle ? `- ${msg.courseTitle}` : ""}
            </p>
          </div>
          <Badge variant="secondary">Inquiry</Badge>
        </div>

        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">
              {formatCurrency(Number(msg.listingPrice ?? 0))}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground">Seller</span>
            <span className="font-semibold">{msg.sellerName || "Seller"}</span>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Listing ID
            </p>
            <p className="text-sm font-medium break-all">{msg.listingId}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderMarketplaceRecommendations = () => {
    if (
      !showMarketplaceRecommendations ||
      marketplaceRecommendations.length === 0
    ) {
      return null;
    }

    return (
      <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Similar items you can check</p>
            <p className="text-xs text-muted-foreground">
              Contextual picks from the same course.
            </p>
          </div>
          {activeConversation?.contextListing?.courseCode && (
            <Badge variant="secondary">
              {activeConversation.contextListing.courseCode}
            </Badge>
          )}
        </div>

        <div className="grid gap-2">
          {marketplaceRecommendations.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={`/item/${item.id}`}
              className="flex items-center gap-3 rounded-lg border bg-background p-2.5 hover:bg-muted/40 transition-colors"
            >
              <img
                src={item.images[0]}
                alt={item.title}
                className="h-12 w-12 rounded-md object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.condition} - {item.courseCode ?? "General"}
                </p>
              </div>
              <span className="text-sm font-semibold text-primary shrink-0">
                {formatCurrency(item.price)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-2 z-40 flex h-[calc(100vh-7rem)] max-h-160 w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:bottom-6 sm:right-6 sm:h-[calc(100vh-7.5rem)] sm:max-h-168 sm:w-[24rem] md:top-23 md:bottom-auto md:h-[calc(100vh-7.25rem)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-primary px-3 py-2.5 text-primary-foreground sm:px-4">
        <div className="flex items-center gap-2 min-w-0">
          {activeConversation ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground shrink-0"
                onClick={() => setActiveConversation(null)}
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {getOtherParticipant(activeConversation).name}
                </p>
                {activeConversation.contextCourse && (
                  <p className="text-xs text-primary-foreground/70 truncate">
                    {formatTutorCourse(activeConversation.contextCourse)}
                  </p>
                )}
                <p className="text-xs text-primary-foreground/70">Active now</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-semibold text-sm">Messages</span>
              {conversations.length > 0 && (
                <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground shrink-0"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation list */}
      {!activeConversation ? (
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-20" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs">
                Contact a seller or tutor to start chatting.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                return (
                  <button
                    key={conv.id}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 sm:p-4"
                    onClick={() => setActiveConversation(conv)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={otherUser.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {otherUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`font-medium text-sm truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}
                        >
                          {otherUser.name}
                        </span>
                        {conv.lastMessage && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(
                              conv.lastMessage.timestamp,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      {conv.contextCourse && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {formatTutorCourse(conv.contextCourse)}
                        </p>
                      )}
                      {conv.lastMessage && (
                        <p
                          className={`mt-0.5 text-xs leading-5 text-muted-foreground ${conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                        >
                          {conv.lastMessage.senderId === user?.id
                            ? "You: "
                            : ""}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      ) : (
        <>
          <ScrollArea
            className="flex-1 px-3 py-3 sm:px-4"
            viewportRef={viewportRef}
          >
            <div className="space-y-2.5">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                const timestamp = msg.createdAt || msg.timestamp;
                return (
                  <div
                    key={msg.id}
                    className={`flex animate-[fadeIn_180ms_ease-out] ${isMine ? "justify-end pr-1" : "justify-start pl-1"}`}
                  >
                    {msg.type === "tutor_request" ? (
                      renderTutorRequestCard(msg, isMine)
                    ) : msg.type === "course_recommendation" ? (
                      renderCourseRecommendationCard(msg)
                    ) : msg.type === "marketplace_inquiry" ? (
                      renderMarketplaceInquiryCard(msg)
                    ) : (
                      <div className="flex min-w-0 max-w-[92%] sm:max-w-[84%] md:max-w-[72%] flex-col gap-1">
                        <div
                          className={`max-w-full rounded-[1.15rem] px-3 py-2 text-sm leading-5 whitespace-pre-wrap break-words shadow-sm group relative
                            ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-tr-[0.35rem]"
                                : "bg-muted text-foreground rounded-tl-[0.35rem]"
                            }`}
                          onMouseEnter={() => {
                            if (msg.content && !isMine) {
                              // Show copy button
                            }
                          }}
                        >
                          {msg.content}
                          {isMine && msg.id && (
                            <span className="text-xs ml-1 opacity-70 inline-flex items-center gap-1">
                              {msg.id === copiedMessageId ? (
                                <>
                                  <CheckIcon className="h-3 w-3" />
                                  Copied
                                </>
                              ) : null}
                            </span>
                          )}
                        </div>
                        {!isMine && (
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded ml-1"
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            {copiedMessageId === msg.id ? (
                              <CheckIcon className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        {timestamp && (
                          <div
                            className={`text-[11px] ${isMine ? "text-right text-muted-foreground" : "text-left text-muted-foreground/80"}`}
                          >
                            {new Date(timestamp).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <div className="px-3 pb-2">{renderMarketplaceRecommendations()}</div>
          {isTyping && (
            <div className="px-3 pb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-100" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-200" />
              </div>
              <span>Composing...</span>
            </div>
          )}
          <div className="shrink-0 border-t bg-background/95 p-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.03)] sm:p-3">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 px-2 py-2 transition-all focus-within:border-primary/50 focus-within:bg-muted/50"
            >
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isSending) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
                className="flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                loading={isSending}
                disabled={!newMessage.trim() || isSending}
                className="h-9 w-9 rounded-full transition-all"
                data-testid="btn-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-1.5 text-xs text-muted-foreground text-center">
              Shift + Enter for new line
            </div>
          </div>
        </>
      )}
    </div>
  );
}
