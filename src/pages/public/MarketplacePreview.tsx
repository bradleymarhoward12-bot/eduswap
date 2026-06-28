import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { usePendingAction } from "@/context/PendingActionContext";
import { subscribeToListings } from "@/services/listings";
import { ItemGrid } from "@/components/marketplace/ItemGrid";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Store } from "lucide-react";
import type { ListingItem } from "@/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreListing(item: ListingItem, query: string) {
  const term = normalize(query);
  if (!term) return 0;
  const courseCode = normalize(item.courseCode ?? "");
  const courseTitle = normalize(item.courseTitle ?? "");
  if (courseCode === term) return 100;
  if (courseCode.startsWith(term)) return 90;
  if (courseCode.includes(term)) return 80;
  if (courseTitle.includes(term)) return 60;
  if (
    normalize(item.title).includes(term) ||
    normalize(item.description).includes(term)
  )
    return 40;
  return 0;
}

export default function MarketplacePreview() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("All");
  const [listings, setListings] = useState<ListingItem[]>([]);

  useEffect(() => subscribeToListings(setListings), []);

  const filteredListings = useMemo(() => {
    const min = Number(minPrice);
    const max = Number(maxPrice);

    return [...listings]
      .filter((item) => {
        const term = searchQuery.trim().toLowerCase();
        const score = scoreListing(item, term);
        const keywordMatch =
          !term ||
          score > 0 ||
          normalize(item.title).includes(term) ||
          normalize(item.description).includes(term) ||
          normalize(item.sellerName).includes(term);
        const matchesCondition =
          condition === "All" || item.condition === condition;
        const matchesMin =
          !Number.isFinite(min) || minPrice === "" || item.price >= min;
        const matchesMax =
          !Number.isFinite(max) || maxPrice === "" || item.price <= max;
        return keywordMatch && matchesCondition && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        const scoreA = scoreListing(a, searchQuery);
        const scoreB = scoreListing(b, searchQuery);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [condition, listings, maxPrice, minPrice, searchQuery]);

  const handleItemClick = (item: ListingItem) => {
    setLocation(`/item/${item.id}`);
  };

  const { setPendingAction } = usePendingAction();

  const handleAuthRequiredAction = (
    item: ListingItem,
    type: "message" | "offer" | "save",
  ) => {
    setPendingAction({
      type,
      listingId: item.id,
    });
    setLocation(`/item/${item.id}`);
  };

  const handleMessageAction = (item: ListingItem) =>
    handleAuthRequiredAction(item, "message");
  const handleOfferAction = (item: ListingItem) =>
    handleAuthRequiredAction(item, "offer");
  const handleSaveAction = (item: ListingItem) =>
    handleAuthRequiredAction(item, "save");

  return (
    <div className="space-y-8 py-8 lg:space-y-10 lg:py-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            Campus Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Course-first discovery with direct actions on each card.
          </p>
        </div>

        <div className="grid w-full gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm md:w-lg md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search course code or keywords..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="flex flex-wrap gap-2">
        {["All", "New", "Like New", "Good", "Fair", "Poor"].map((value) => (
          <button
            key={value}
            onClick={() => setCondition(value)}
            className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition duration-150
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredListings.length} results
        </p>
        <Badge variant="secondary">Interaction-first marketplace</Badge>
      </div>

      <ItemGrid
        items={filteredListings}
        onItemClick={handleItemClick}
        onItemMessage={handleMessageAction}
        onItemOffer={handleOfferAction}
        onItemSave={handleSaveAction}
      />
    </div>
  );
}
