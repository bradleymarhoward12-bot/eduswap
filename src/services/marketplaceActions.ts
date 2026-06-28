import type { ListingItem, User } from "@/types";
import { getUserFullName } from "@/services/firebase";
import { addInterest, removeInterest } from "@/services/interests";
import { sendMarketplaceInquiry, type ChatParticipant } from "@/services/chat";
import { recordUserActivity } from "@/services/recommendations";

export function buildMarketplaceParticipant(user: User): ChatParticipant {
  return {
    id: user.id,
    fullName: user.fullName,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    initials: user.initials,
    university: user.university,
    joinedAt: user.joinedAt,
  };
}

export async function toggleMarketplaceSave(input: {
  user: User;
  listing: ListingItem;
  isSaved: boolean;
}): Promise<{ saved: boolean }> {
  const fullName = getUserFullName(input.user);

  if (input.isSaved) {
    await removeInterest(input.user.id, input.listing.id, "listing");
    return { saved: false };
  }

  await addInterest({
    userId: input.user.id,
    targetId: input.listing.id,
    type: "listing",
    studentId: input.user.id,
    studentName: fullName,
    contextLabel: input.listing.courseCode ?? input.listing.category,
    status: "pending",
    targetName: input.listing.title,
    message: `${fullName} saved ${input.listing.title}`,
    courseCode: input.listing.courseCode,
    courseTitle: input.listing.courseTitle,
  });

  await recordUserActivity({
    userId: input.user.id,
    type: "save",
    listingId: input.listing.id,
    courseCode: input.listing.courseCode ?? "",
  });

  return { saved: true };
}

export async function sendMarketplaceMessage(input: {
  user: User;
  listing: ListingItem;
  openChat: (
    sellerId: string,
    sellerName: string,
    contextCourse: null,
    contextListing?: { listingId: string; courseCode?: string },
    initialMessage?: string,
  ) => Promise<string | null>;
}): Promise<string | null> {
  // Keep the initial chat draft short (no full URL) to avoid overflowing the chat input
  const initialMessage = `Hi! I’m interested in "${input.listing.title}".`;

  const chatId = await input.openChat(
    input.listing.sellerId,
    input.listing.sellerName,
    null,
    {
      listingId: input.listing.id,
      courseCode: input.listing.courseCode,
    },
    initialMessage,
  );
  if (!chatId) {
    return null;
  }

  await sendMarketplaceInquiry({
    chatId,
    sender: buildMarketplaceParticipant(input.user),
    listingId: input.listing.id,
    listingTitle: input.listing.title,
    listingPrice: input.listing.price,
    courseCode: input.listing.courseCode,
    courseTitle: input.listing.courseTitle,
    sellerName: input.listing.sellerName,
  });

  await recordUserActivity({
    userId: input.user.id,
    type: "message",
    listingId: input.listing.id,
    courseCode: input.listing.courseCode ?? "",
  });

  return chatId;
}

export async function recordMarketplaceOffer(input: {
  user: User;
  listing: ListingItem;
  offerAmount: string;
}): Promise<number | null> {
  const amount = Number.parseFloat(input.offerAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  await recordUserActivity({
    userId: input.user.id,
    type: "offer",
    listingId: input.listing.id,
    courseCode: input.listing.courseCode ?? "",
  });

  return amount;
}
