import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { subscribeToSavedItems } from "@/services/interests";
import { subscribeToListings } from "@/services/listings";
import { ItemGrid } from "@/components/marketplace/ItemGrid";
import { Button } from "@/components/ui/button";
import { Heart, ChevronLeft } from "lucide-react";
import type { ListingItem } from "@/types";

type SavedGroup = {
  courseCode: string;
  items: ListingItem[];
};

export default function MyFavourites() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => subscribeToListings(setListings), []);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return undefined;
    }

    return subscribeToSavedItems(user.id, (savedItems) => {
      setSavedIds(
        savedItems
          .filter((item) => item.type === "listing")
          .map((item) => item.itemId),
      );
    });
  }, [user]);

  const savedListings = useMemo(
    () => listings.filter((listing) => savedIds.includes(listing.id)),
    [listings, savedIds],
  );

  const groupedListings = useMemo<SavedGroup[]>(() => {
    const groups = new Map<string, ListingItem[]>();

    savedListings.forEach((listing) => {
      const key = listing.courseCode?.trim() || "Unassigned";
      const current = groups.get(key) ?? [];
      current.push(listing);
      groups.set(key, current);
    });

    return Array.from(groups.entries())
      .map(([courseCode, items]) => ({
        courseCode,
        items: items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [savedListings]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <Heart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Saved Listings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Grouped by course code for faster revisits.
            </p>
          </div>
        </div>
      </div>

      {groupedListings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-sm">No saved items yet.</p>
          <Button className="mt-4" onClick={() => setLocation("/marketplace")}>
            Browse marketplace
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedListings.map((group) => (
            <section key={group.courseCode} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Course: {group.courseCode}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {group.items.length} saved item
                    {group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ItemGrid
                items={group.items}
                onItemClick={(item) => setLocation(`/item/${item.id}`)}
                savedItemIds={savedIds}
                currentUserId={user?.id}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
