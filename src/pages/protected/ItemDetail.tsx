import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Clock,
  Heart,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useNotifications } from "@/context/NotificationContext";
import { usePendingAction } from "@/context/PendingActionContext";
import { useToast } from "@/hooks/use-toast";
import { subscribeToSavedItems } from "@/services/interests";
import { subscribeToListingById } from "@/services/listings";
import {
  getCourseResources,
  getRelatedListings,
  recordUserActivity,
} from "@/services/recommendations";
import {
  sendMarketplaceMessage,
  toggleMarketplaceSave,
} from "@/services/marketplaceActions";
import { getUserFullName } from "@/services/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthModal } from "@/components/auth/AuthModal";
import { ItemGrid } from "@/components/marketplace/ItemGrid";
import { formatCurrency } from "@/utils/formatCurrency";
import type { ListingItem } from "@/types";

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { openChat } = useChat();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const { pendingAction, clearPendingAction, setPendingAction } =
    usePendingAction();
  const [listing, setListing] = useState<ListingItem | null>(null);
  const [isListingLoading, setIsListingLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [relatedListings, setRelatedListings] = useState<ListingItem[]>([]);
  const [courseResources, setCourseResources] = useState<
    Array<{
      id: string;
      courseCode: string;
      title: string;
      description: string;
      type: "book" | "reviewer" | "notes";
      optionalListingId?: string;
    }>
  >([]);
  const [showInlineRecommendations, setShowInlineRecommendations] =
    useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const viewedListingId = useRef<string | null>(null);
  const hasPromptedAuthRef = useRef(false);
  const pendingMarketplaceListingId =
    pendingAction &&
    "listingId" in pendingAction &&
    (pendingAction.type === "save" ||
      pendingAction.type === "offer" ||
      pendingAction.type === "message")
      ? pendingAction.listingId
      : undefined;

  useEffect(() => {
    if (!id) return undefined;
    setListing(null);
    setIsListingLoading(true);
    return subscribeToListingById(id, (nextListing) => {
      setListing(nextListing);
      setIsListingLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!listing?.id) {
      setRelatedListings([]);
      return undefined;
    }

    let cancelled = false;
    void getRelatedListings({
      currentListingId: listing.id,
      courseCode: listing.courseCode,
      category: listing.category,
      title: listing.title,
      subcategory: listing.subcategory,
      courseTitle: listing.courseTitle,
      tags: listing.tags,
      price: listing.price,
      condition: listing.condition,
    }).then((items) => {
      if (!cancelled) {
        setRelatedListings(items);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [listing?.id, listing?.courseCode, listing?.condition, listing?.price]);

  useEffect(() => {
    if (!listing?.courseCode && !listing?.courseTitle) {
      setCourseResources([]);
      return undefined;
    }

    let cancelled = false;
    void getCourseResources(listing.courseCode ?? "", listing.courseTitle).then(
      (resources) => {
        if (!cancelled) {
          setCourseResources(resources);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [listing?.courseCode]);

  useEffect(() => {
    if (!user || !id) {
      setLiked(false);
      return undefined;
    }

    return subscribeToSavedItems(user.id, (savedItems) => {
      setLiked(
        savedItems.some(
          (item) => item.itemId === id && item.type === "listing",
        ),
      );
    });
  }, [id, user]);

  useEffect(() => {
    if (!user || !listing || listing.sellerId === user.id) {
      return;
    }

    if (viewedListingId.current === listing.id) {
      return;
    }

    viewedListingId.current = listing.id;
    void recordUserActivity({
      userId: user.id,
      type: "view",
      listingId: listing.id,
      courseCode: listing.courseCode ?? "",
    }).catch((error) => {
      // Silently fail if permission denied - user can still view the listing
      if (error instanceof Error && error.message.includes("permission")) {
        console.debug("Activity tracking permission denied");
      } else {
        console.error("Failed to record user activity", error);
      }
    });
  }, [listing, user]);

  const isOwner = user?.id === listing?.sellerId;
  const isSold = !listing?.isAvailable || listing?.status === "sold";
  const fullName = getUserFullName(user);
  const promptSignIn = (type: "save" | "message") => {
    setPendingAction({
      type,
      listingId: id,
    });
    setIsAuthModalOpen(true);
  };

  const showRecommendations =
    showInlineRecommendations || relatedListings.length > 0;

  const handleInterest = async () => {
    if (!user || !listing) {
      promptSignIn("save");
      return;
    }

    const next = !liked;
    const previousLiked = liked;
    const previousListing = listing;

    setLiked(next);
    setListing((current) =>
      current
        ? {
            ...current,
            interestedCount: Math.max(
              0,
              current.interestedCount + (next ? 1 : -1),
            ),
            savesCount: Math.max(
              0,
              (current.savesCount ?? current.interestedCount ?? 0) +
                (next ? 1 : -1),
            ),
            likesCount: Math.max(
              0,
              (current.likesCount ?? current.interestedCount ?? 0) +
                (next ? 1 : -1),
            ),
            interestedUsers: next
              ? Array.from(
                  new Set([...(current.interestedUsers ?? []), user.id]),
                )
              : (current.interestedUsers ?? []).filter(
                  (interestedUserId) => interestedUserId !== user.id,
                ),
            latestInterestAt: new Date().toISOString(),
          }
        : current,
    );

    if (next) {
      try {
        await toggleMarketplaceSave({
          user,
          listing,
          isSaved: false,
        });
      } catch (error) {
        console.error("Failed to save listing", error);
        // Revert optimistic UI on failure (network / permission issues)
        setLiked(previousLiked);
        setListing(previousListing);
        // Helpful hint: ad-blockers or privacy extensions can block Firestore
        console.warn(
          "If this persists, check browser extensions that may block Firebase network requests.",
        );
        return;
      }
      try {
        await addNotification({
          userId: listing.sellerId,
          type: "interest",
          title: "Someone is interested!",
          body: `${fullName} is interested in your listing: ${listing.title}`,
          relatedId: listing.id,
        });
      } catch (error) {
        console.debug("Failed to send notification");
      }
      setShowInlineRecommendations(true);
      toast({
        title: "Added to favourites!",
        description: "The seller has been notified.",
      });
    } else {
      try {
        await toggleMarketplaceSave({
          user,
          listing,
          isSaved: true,
        });
      } catch (error) {
        console.error("Failed to unsave listing", error);
        // Revert optimistic UI on failure
        setLiked(previousLiked);
        setListing(previousListing);
        console.warn(
          "If this persists, check browser extensions that may block Firebase network requests.",
        );
      }
      toast({ title: "Removed from favourites" });
    }
  };

  const handleContact = async () => {
    if (!user || !listing) {
      promptSignIn("message");
      return;
    }
    if (isOwner) return;

    const chatId = await sendMarketplaceMessage({
      user,
      listing,
      openChat,
    });
    if (chatId) {
      setShowInlineRecommendations(true);
    }
  };

  useEffect(() => {
    hasPromptedAuthRef.current = false;
  }, [id, pendingMarketplaceListingId, pendingAction?.type]);

  useEffect(() => {
    if (!user || !listing || !pendingAction) {
      if (
        !user &&
        pendingMarketplaceListingId === id &&
        !hasPromptedAuthRef.current
      ) {
        hasPromptedAuthRef.current = true;
        setIsAuthModalOpen(true);
      }
      return;
    }

    if (
      pendingAction.type === "viewTutor" ||
      pendingAction.type === "requestTutor"
    ) {
      return;
    }

    if (pendingMarketplaceListingId !== id) {
      return;
    }

    const runPendingAction = async () => {
      try {
        switch (pendingAction.type) {
          case "save":
            await handleInterest();
            break;
          case "message":
            await handleContact();
            break;
          default:
            break;
        }
      } finally {
        clearPendingAction();
      }
    };

    void runPendingAction();
  }, [
    clearPendingAction,
    handleContact,
    handleInterest,
    id,
    listing,
    pendingAction,
    pendingMarketplaceListingId,
    user,
  ]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [listing?.id]);

  if (!listing) {
    if (isListingLoading) {
      return (
        <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
          <div className="h-10 w-40 rounded bg-muted" />
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square rounded-xl border bg-muted/30" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-muted" />
              <div className="h-10 w-1/3 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-16 w-full rounded bg-muted" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Item not available</h2>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Back to marketplace
        </Link>
      </div>
    );
  }

  const images = listing?.images?.filter(Boolean) ?? [];
  const mainImage = images[selectedImageIndex] ?? images[0] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-3 sm:py-4">
      <Link
        href="/marketplace"
        className="-ml-2 mb-1 inline-flex items-center rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Marketplace
      </Link>

      {listing && (
        <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr] lg:gap-6">
          <div className="space-y-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="aspect-[3/2] w-full">
                <img
                  src={mainImage}
                  alt={listing.title}
                  className="h-full w-full object-cover transition duration-200 ease-out"
                />
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-16 w-16 overflow-hidden rounded-xl border transition-all ${
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/70"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${listing.title} ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{listing.category}</Badge>
                <Badge variant="secondary">{listing.condition}</Badge>
                {!listing.isAvailable && (
                  <Badge variant="destructive">Sold</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-semibold tracking-tight">
                  {listing.title}
                </h1>
                <div className="text-xl font-semibold text-primary">
                  {formatCurrency(listing.price)}
                </div>
              </div>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-5 text-muted-foreground sm:text-[14px]">
              {listing.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 border-y py-2.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  Listed {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Heart
                  className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`}
                />
                <span>{liked ? "Saved" : "Not saved"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={listing.sellerAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {listing.sellerName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{listing.sellerName}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      <span>Verified Student</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isOwner && (
              <div className="sticky bottom-2 z-10 flex flex-col gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80 sm:flex-row sm:gap-2.5 sm:p-2.5">
                <Button
                  size="lg"
                  className="h-11 flex-1 gap-2"
                  onClick={handleContact}
                  data-testid="btn-contact-seller"
                  disabled={isSold}
                >
                  <MessageSquare className="h-5 w-5" />
                  Message Seller
                </Button>
                <Button
                  size="lg"
                  variant={liked ? "secondary" : "outline"}
                  className="h-11 flex-1 gap-2"
                  onClick={handleInterest}
                  data-testid="btn-interest"
                  disabled={isSold}
                >
                  <Heart
                    className={`h-5 w-5 transition-all ${liked ? "fill-current" : ""}`}
                  />
                  {liked ? "Saved" : "Save"}
                </Button>
              </div>
            )}

            {isOwner && (
              <div className="pt-2">
                <Link
                  href="/my-listings"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border/80 bg-background px-7 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/70 hover:bg-primary/5"
                >
                  Manage Your Listing
                </Link>
              </div>
            )}

            {listing.courseCode && (
              <section className="space-y-3 rounded-2xl border bg-card/70 p-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Recommended Learning Materials
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Materials aligned with this item’s course context.
                  </p>
                </div>
                {courseResources.length > 0 ? (
                  <div className="grid gap-2">
                    {courseResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {resource.title}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
                              View material
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    No saved course resources yet.
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {showRecommendations && (
        <section className="space-y-4 pt-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Similar Items</h2>
              <p className="text-sm text-muted-foreground">
                More items aligned with this listing's category and keywords.
              </p>
            </div>
            {showInlineRecommendations && (
              <span className="text-xs font-medium text-primary">
                Similar items you can check
              </span>
            )}
          </div>
          {relatedListings.length > 0 ? (
            <ItemGrid
              items={relatedListings}
              onItemClick={(item) => setLocation(`/item/${item.id}`)}
              currentUserId={user?.id}
            />
          ) : (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              No close matches yet, but the system will continue to learn from
              saved and viewed items.
            </div>
          )}
        </section>
      )}

      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}
