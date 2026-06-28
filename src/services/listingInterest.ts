import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/services/firebase";
import type {
  ListingInterestRecord,
  ListingInterestSummary,
  ListingInterestInput,
  ListingOfferInput,
  ListingOfferStatus,
} from "@/types";

function listingInterestCollection() {
  return collection(db, "listingInterest");
}

function saveDocId(userId: string, listingId: string) {
  return `save:${userId}:${listingId}`;
}

function viewDocId(userId: string, listingId: string) {
  return `view:${userId}:${listingId}`;
}

function normalizeListingInterestDoc(
  data: Record<string, unknown>,
  id: string,
): ListingInterestRecord {
  return {
    id,
    listingId: (data.listingId as string) ?? "",
    sellerId: (data.sellerId as string) ?? "",
    userId: (data.userId as string) ?? "",
    type: (data.type as ListingInterestRecord["type"]) ?? "view",
    createdAt: (data.createdAt as string) ?? new Date(0).toISOString(),
    offerAmount: (data.offerAmount as number | undefined) ?? undefined,
    message: (data.message as string | undefined) ?? undefined,
    status:
      (data.status as ListingInterestRecord["status"] | undefined) ?? undefined,
    listingTitle: (data.listingTitle as string | undefined) ?? undefined,
    listingPrice: (data.listingPrice as number | undefined) ?? undefined,
    sellerName: (data.sellerName as string | undefined) ?? undefined,
    buyerName: (data.buyerName as string | undefined) ?? undefined,
  };
}

export async function recordListingInterest(
  input: ListingInterestInput,
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const docId =
    input.type === "save"
      ? saveDocId(input.userId, input.listingId)
      : input.type === "view"
        ? viewDocId(input.userId, input.listingId)
        : undefined;

  const payload = {
    id: docId ?? "",
    ...input,
    createdAt: serverTimestamp(),
  };

  if (docId) {
    const ref = doc(listingInterestCollection(), docId);
    const existing = await getDoc(ref);
    await setDoc(ref, payload, { merge: true });

    if (input.type === "save" && !existing.exists()) {
      await updateDoc(doc(db, "listings", input.listingId), {
        interestedCount: increment(1),
        savesCount: increment(1),
        likesCount: increment(1),
        interestedUsers: arrayUnion(input.userId),
        latestInterestAt: serverTimestamp(),
      });
    }

    return docId;
  }

  const ref = await addDoc(collection(db, "listingInterest"), payload);

  if (input.type === "save") {
    await updateDoc(doc(db, "listings", input.listingId), {
      interestedCount: increment(1),
    });
  }

  return ref.id;
}

export async function removeListingSave(
  userId: string,
  listingId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const id = saveDocId(userId, listingId);
  const ref = doc(listingInterestCollection(), id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  await deleteDoc(ref);
  await updateDoc(doc(db, "listings", listingId), {
    interestedCount: increment(-1),
    savesCount: increment(-1),
    likesCount: increment(-1),
    interestedUsers: arrayRemove(userId),
  });
}

export async function createListingOffer(
  input: ListingOfferInput,
): Promise<string> {
  return recordListingInterest({
    ...input,
    type: "offer",
    status: input.status ?? "pending",
  });
}

export async function updateListingOfferStatus(
  id: string,
  status: ListingOfferStatus,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(
    doc(listingInterestCollection(), id),
    { status },
    { merge: true },
  );
}

export function subscribeToSavedListings(
  userId: string,
  callback: (listingIds: string[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      listingInterestCollection(),
      where("userId", "==", userId),
      where("type", "==", "save"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs
          .map(
            (entry) =>
              (entry.data() as Record<string, unknown>).listingId as string,
          )
          .filter(Boolean),
      );
    },
    (error) => {
      console.error("Saved listings listener error", error);
      callback([]);
    },
  );
}

export function subscribeToSellerListingInteractions(
  sellerId: string,
  callback: (summary: ListingInterestSummary) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback({});
    return () => undefined;
  }

  return onSnapshot(
    query(listingInterestCollection(), where("sellerId", "==", sellerId)),
    (snapshot) => {
      const summary: ListingInterestSummary = {};
      snapshot.docs.forEach((entry) => {
        const data = entry.data() as Record<string, unknown>;
        const record = normalizeListingInterestDoc(data, entry.id);
        const listingId = record.listingId;
        if (!listingId) return;
        if (!summary[listingId]) {
          summary[listingId] = {
            listingId,
            saves: 0,
            offers: 0,
            messages: 0,
            views: 0,
            latestInteraction: undefined,
          };
        }

        switch (record.type) {
          case "save":
            summary[listingId].saves += 1;
            break;
          case "offer":
            summary[listingId].offers += 1;
            break;
          case "message":
            summary[listingId].messages += 1;
            break;
          case "view":
            summary[listingId].views += 1;
            break;
        }

        if (
          !summary[listingId].latestInteraction ||
          new Date(record.createdAt).getTime() >
            new Date(summary[listingId].latestInteraction.createdAt).getTime()
        ) {
          summary[listingId].latestInteraction = record;
        }
      });
      callback(summary);
    },
    (error) => {
      console.error("Seller listing interactions listener error", error);
      callback({});
    },
  );
}

export function subscribeToSellerOffers(
  sellerId: string,
  callback: (offers: ListingInterestRecord[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(
      listingInterestCollection(),
      where("sellerId", "==", sellerId),
      where("type", "==", "offer"),
    ),
    (snapshot) => {
      callback(
        snapshot.docs.map((entry) =>
          normalizeListingInterestDoc(
            entry.data() as Record<string, unknown>,
            entry.id,
          ),
        ),
      );
    },
    (error) => {
      console.error("Seller offers listener error", error);
      callback([]);
    },
  );
}
