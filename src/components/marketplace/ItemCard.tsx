import { type MouseEvent, useState } from "react";
import { ListingItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { Heart, Clock, MessageSquare, Eye } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ItemCardProps {
  item: ListingItem;
  onClick: () => void;
  onMessage?: () => void | Promise<void>;
  onOffer?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  isSaved?: boolean;
  isBlurred?: boolean;
  isSold?: boolean;
  isOwner?: boolean;
  isSaving?: boolean;
  isMessagePending?: boolean;
}

function formatCourseLine(item: ListingItem) {
  const courseCode = item.courseCode?.trim();
  const courseTitle = item.courseTitle?.trim();
  if (!courseCode && !courseTitle) {
    return "";
  }

  return [courseCode, courseTitle].filter(Boolean).join(" • ");
}

export function ItemCard({
  item,
  onClick,
  onMessage,
  onSave,
  isSaved = false,
  isBlurred = false,
  isOwner = false,
  isSaving = false,
  isMessagePending = false,
  isSold = !item.isAvailable || item.status === "sold",
}: ItemCardProps) {
  const liked = isSaved;

  const handleSave = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    await onSave?.();
  };

  const handleMessage = async (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    await onMessage?.();
  };

  const courseLine = formatCourseLine(item);
  const sellerName = item.sellerName?.trim() || "Student Seller";

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`item-card-${item.id}`}
    >
      <div
        className={`flex flex-1 cursor-pointer flex-col ${isSold ? "opacity-75" : ""}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
      >
        <div className="relative w-full">
          <AspectRatio ratio={4 / 3}>
            <img
              src={item.images?.[0] ?? ""}
              alt={item.title}
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${isBlurred ? "blur-sm" : ""}`}
            />
          </AspectRatio>
          {isBlurred && (
            <div className="absolute inset-0 bg-background/10 backdrop-blur-[3px]" />
          )}

          {/* Status Badges */}
          <div className="absolute left-3 top-3 flex gap-2">
            {isSold && <Badge variant="destructive">Sold</Badge>}
            {item.condition && item.condition !== "Good" && (
              <Badge variant="secondary" className="text-xs">
                {item.condition}
              </Badge>
            )}
          </div>

          {/* Price Badge */}
          <div className="absolute right-3 top-3 bg-primary text-primary-foreground font-bold px-3 py-1.5 rounded-full text-sm shadow-md">
            {formatCurrency(item.price)}
          </div>

          {/* Interest Count */}
          {(item.interestedCount ?? 0) > 0 && (
            <div className="absolute right-3 bottom-3 flex items-center gap-1 bg-background/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground">
              <Eye className="h-3 w-3" />
              {item.interestedCount} interested
            </div>
          )}

          {/* Save Button */}
          {onSave && !isOwner && (
            <Button
              type="button"
              size="icon"
              variant={liked ? "secondary" : "outline"}
              className="absolute left-3 bottom-3 h-10 w-10 rounded-full border-border/70 bg-background/95 shadow-sm backdrop-blur transition-all"
              onClick={handleSave}
              disabled={isSold || isSaving}
              loading={isSaving}
              aria-label={liked ? "Remove from saved items" : "Save item"}
            >
              <Heart
                className={`h-4 w-4 transition-all ${liked ? "fill-current scale-110 text-red-500" : ""}`}
              />
            </Button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2 sm:p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              {courseLine && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {courseLine}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-auto">
            <span className="truncate font-medium">{sellerName}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-border/60">
            {onMessage && !isOwner ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full h-8 gap-2 rounded-lg text-sm font-medium"
                onClick={handleMessage}
                disabled={isSold || isMessagePending}
                loading={isMessagePending}
              >
                <MessageSquare className="h-4 w-4" />
                Message Seller
              </Button>
            ) : isOwner ? (
              <div className="text-xs text-center text-muted-foreground py-1.5">
                Your listing
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
