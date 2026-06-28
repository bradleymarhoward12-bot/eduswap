import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useChat } from "@/context/ChatContext";
import { subscribeToSavedItems } from "@/services/interests";
import { subscribeToListings } from "@/services/listings";
import { ItemGrid } from "@/components/marketplace/ItemGrid";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRelatedListings } from "@/services/recommendations";
import {
  sendMarketplaceMessage,
  toggleMarketplaceSave,
} from "@/services/marketplaceActions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Store, ChevronDown, Filter, X } from "lucide-react";
import type { ListingItem } from "@/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreListing(item: ListingItem, query: string) {
  const term = normalize(query);
  if (!term) return 0;
  const courseCode = normalize(item.courseCode ?? "");
  const courseTitle = normalize(item.courseTitle ?? "");
  const title = normalize(item.title);
  const description = normalize(item.description);
  const seller = normalize(item.sellerName);

  if (courseCode === term) return 100;
  if (courseCode.startsWith(term)) return 90;
  if (courseCode.includes(term)) return 80;
  if (courseTitle.includes(term)) return 60;
  if (title.includes(term)) return 45;
  if (description.includes(term) || seller.includes(term)) return 30;
  return 0;
}

export default function Marketplace() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [courseSearch, setCourseSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("All");
  const [sortBy, setSortBy] = useState<
    "newest" | "price-low" | "price-high" | "popular"
  >("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [savingListingIds, setSavingListingIds] = useState<string[]>([]);
  const [pendingMessageItemId, setPendingMessageItemId] = useState<
    string | null
  >(null);
  const [activeActionItem, setActiveActionItem] = useState<ListingItem | null>(
    null,
  );
  const [savedPromptItem, setSavedPromptItem] = useState<ListingItem | null>(
    null,
  );
  const [actionRecommendations, setActionRecommendations] = useState<
    ListingItem[]
  >([]);

  useEffect(() => subscribeToListings(setListings), []);

  const updateListingInterestLocal = (
    listingId: string,
    delta: 1 | -1,
    userId: string,
  ) => {
    setListings((current) =>
      current.map((item) =>
        item.id === listingId
          ? {
              ...item,
              interestedCount: Math.max(0, item.interestedCount + delta),
              savesCount: Math.max(0, (item.savesCount ?? 0) + delta),
              likesCount: Math.max(0, (item.likesCount ?? 0) + delta),
              interestedUsers:
                delta > 0
                  ? Array.from(
                      new Set([...(item.interestedUsers ?? []), userId]),
                    )
                  : (item.interestedUsers ?? []).filter(
                      (interestedUserId) => interestedUserId !== userId,
                    ),
              latestInterestAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  useEffect(() => {
    if (!user) {
      setSavedListingIds([]);
      return undefined;
    }

    return subscribeToSavedItems(user.id, (savedItems) => {
      setSavedListingIds(
        savedItems
          .filter((item) => item.type === "listing")
          .map((item) => item.itemId),
      );
    });
  }, [user]);

  const filteredListings = useMemo(() => {
    const min = Number(minPrice);
    const max = Number(maxPrice);

    let filtered = [...listings].filter((item) => {
      const search = courseSearch.trim().toLowerCase();
      const termScore = scoreListing(item, search);
      const keywordMatch =
        !search ||
        termScore > 0 ||
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);
      const matchesCondition =
        condition === "All" || item.condition === condition;
      const matchesMin =
        !Number.isFinite(min) || minPrice === "" || item.price >= min;
      const matchesMax =
        !Number.isFinite(max) || maxPrice === "" || item.price <= max;
      return keywordMatch && matchesCondition && matchesMin && matchesMax;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const scoreA = scoreListing(a, courseSearch);
      const scoreB = scoreListing(b, courseSearch);

      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "popular":
          return (b.interestedCount || 0) - (a.interestedCount || 0);
        case "newest":
        default:
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  }, [condition, courseSearch, listings, maxPrice, minPrice, sortBy]);

  useEffect(() => {
    if (!activeActionItem?.courseCode) {
      setActionRecommendations([]);
      return undefined;
    }

    let cancelled = false;
    void getRelatedListings({
      currentListingId: activeActionItem.id,
      courseCode: activeActionItem.courseCode,
      price: activeActionItem.price,
      condition: activeActionItem.condition,
    }).then((items) => {
      if (!cancelled) {
        setActionRecommendations(items);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeActionItem?.condition,
    activeActionItem?.courseCode,
    activeActionItem?.id,
    activeActionItem?.price,
  ]);

  const handleItemClick = (item: ListingItem) => {
    setLocation(`/item/${item.id}`);
  };

  const handleMessage = async (item: ListingItem) => {
    if (!user || pendingMessageItemId) return;

    setPendingMessageItemId(item.id);

    try {
      const chatId = await sendMarketplaceMessage({
        user,
        listing: item,
        openChat,
      });
      if (!chatId) {
        return;
      }
      setActiveActionItem(item);

      toast({
        title: "Chat opened",
        description: "The message includes item context.",
      });
    } finally {
      setPendingMessageItemId(null);
    }
  };

  const handleSave = async (item: ListingItem) => {
    if (!user) return;
    setSavingListingIds((s) => Array.from(new Set([...s, item.id])));
    const isSaved = savedListingIds.includes(item.id);
    const previousSavedIds = savedListingIds.slice();
    const previousListings = listings.slice();

    try {
      if (isSaved) {
        // optimistic UI
        setSavedListingIds((current) => current.filter((id) => id !== item.id));
        updateListingInterestLocal(item.id, -1, user.id);

        try {
          await toggleMarketplaceSave({ user, listing: item, isSaved: true });
        } catch (error) {
          console.error("Failed to unsave listing", error);
          setSavedListingIds(previousSavedIds);
          setListings(previousListings);
          toast({
            title: "Failed to remove saved item",
            variant: "destructive",
          });
        }

        toast({ title: "Removed from saved items" });
        return;
      }

      // optimistic UI for save
      setSavedListingIds((current) =>
        Array.from(new Set([...current, item.id])),
      );
      updateListingInterestLocal(item.id, 1, user.id);
      setActiveActionItem(item);
      setSavedPromptItem(item);

      try {
        await toggleMarketplaceSave({ user, listing: item, isSaved: false });
        toast({
          title: "Saved",
          description: "You can review it anytime from your saved items.",
        });
      } catch (error) {
        console.error("Failed to save listing", error);
        setSavedListingIds(previousSavedIds);
        setListings(previousListings);
        toast({ title: "Failed to save item", variant: "destructive" });
        console.warn(
          "If this persists, check browser extensions that may block Firebase network requests.",
        );
      }
    } finally {
      setSavingListingIds((s) => s.filter((id) => id !== item.id));
    }
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="surface-card flex flex-col gap-3 p-2.5 md:p-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-[1.45rem]">
            <Store className="h-5 w-5 text-primary" />
            Marketplace
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Discover items by course code, not categories.
          </p>
        </div>

        <div className="grid w-full gap-1.5 rounded-lg border border-border/70 bg-muted/20 p-1.5 shadow-sm md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search course code or keywords..."
              className="pl-9"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              data-testid="input-marketplace-search"
            />
          </div>
          <Input
            type="number"
            min="0"
            placeholder="Min price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            min="0"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.25">
          {["All", "New", "Like New", "Good", "Fair", "Poor"].map((value) => (
            <button
              key={value}
              onClick={() => setCondition(value)}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium transition duration-150
                ${
                  condition === value
                    ? "bg-primary text-primary-foreground border border-primary"
                    : "bg-background text-muted-foreground border border-border/70 hover:border-primary hover:text-primary"
                }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-background border border-border/70 rounded-lg px-2 py-1 text-sm font-medium hover:border-primary transition-colors cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
          {(courseSearch || condition !== "All" || minPrice || maxPrice) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCourseSearch("");
                setCondition("All");
                setMinPrice("");
                setMaxPrice("");
              }}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.25">
        <p className="text-sm text-muted-foreground">
          {filteredListings.length}{" "}
          {filteredListings.length === 1 ? "result" : "results"}
        </p>
        <Badge variant="secondary">Course-centric discovery</Badge>
      </div>

      <ItemGrid
        items={filteredListings}
        onItemClick={handleItemClick}
        onItemMessage={handleMessage}
        onItemSave={handleSave}
        savedItemIds={savedListingIds}
        currentUserId={user?.id}
        savingItemIds={savingListingIds}
      />

      <Dialog
        open={Boolean(savedPromptItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSavedPromptItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item saved ✓</DialogTitle>
            <DialogDescription>
              {savedPromptItem?.title ?? "This item"} is now in your saved
              items.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setSavedPromptItem(null)}>
              Keep browsing
            </Button>
            <Button
              onClick={() => {
                setSavedPromptItem(null);
                setLocation("/my-favourites");
              }}
            >
              View saved items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeActionItem && (
        <section className="space-y-3 rounded-xl border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Similar items you can check
              </h2>
              <p className="text-sm text-muted-foreground">
                Related to {activeActionItem.courseCode || "this course"}.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveActionItem(null)}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {actionRecommendations.length > 0 ? (
            <ItemGrid
              items={actionRecommendations.slice(0, 6)}
              onItemClick={handleItemClick}
              onItemMessage={handleMessage}
              onItemSave={handleSave}
              savedItemIds={savedListingIds}
              currentUserId={user?.id}
            />
          ) : (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              No related items found yet.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
