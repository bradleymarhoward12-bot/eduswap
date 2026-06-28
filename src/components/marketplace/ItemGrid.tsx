import { ListingItem } from "@/types";
import { ItemCard } from "./ItemCard";

interface ItemGridProps {
  items: ListingItem[];
  onItemClick: (item: ListingItem) => void;
  onItemMessage?: (item: ListingItem) => void | Promise<void>;
  onItemOffer?: (item: ListingItem) => void | Promise<void>;
  onItemSave?: (item: ListingItem) => void | Promise<void>;
  savedItemIds?: string[];
  savingItemIds?: string[];
  blurItems?: boolean;
  currentUserId?: string | null;
}

export function ItemGrid({
  items,
  onItemClick,
  onItemMessage,
  onItemOffer,
  onItemSave,
  savedItemIds = [],
  savingItemIds = [],
  blurItems = false,
  currentUserId,
}: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="surface-card border-dashed p-6 text-center text-muted-foreground sm:p-8">
        <p>No items found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
          onMessage={onItemMessage ? () => onItemMessage(item) : undefined}
          onOffer={onItemOffer ? () => onItemOffer(item) : undefined}
          onSave={onItemSave ? () => onItemSave(item) : undefined}
          isSaved={savedItemIds.includes(item.id)}
          isSaving={savingItemIds.includes(item.id)}
          isBlurred={blurItems}
          isSold={!item.isAvailable || item.status === "sold"}
          isOwner={Boolean(currentUserId && item.sellerId === currentUserId)}
        />
      ))}
    </div>
  );
}
