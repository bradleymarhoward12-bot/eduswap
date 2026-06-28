import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  updateDoc,
  where,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured, mapListingDoc } from "@/services/firebase";
import { resolveListingImageUrl } from "@/utils/listingImage";
import type { ListingItem } from "@/types";

export interface ListingInput {
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  condition: string;
  imageUrl: string;
  images?: string[];
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  relatedCourseCodes?: string[];
  courseCode?: string;
  courseTitle?: string;
  tags?: string[];
  status?: "active" | "sold" | "inactive";
  isAvailable?: boolean;
}

export interface ListingUpdateInput {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  subcategory?: string;
  condition?: string;
  imageUrl?: string;
  images?: string[];
  sellerName?: string;
  sellerAvatar?: string;
  relatedCourseCodes?: string[];
  courseCode?: string;
  courseTitle?: string;
  tags?: string[];
  status?: "active" | "sold" | "inactive";
  isAvailable?: boolean;
}

type ListingsCallback = (listings: ListingItem[]) => void;

function sanitizeListingPayload<T extends Record<string, unknown>>(
  input: T,
): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function buildListingQuery(options?: {
  sellerId?: string;
  limit?: number;
  onlyAvailable?: boolean;
}) {
  const base = collection(db, "listings");
  const filters = [];
  if (options?.sellerId) {
    filters.push(where("sellerId", "==", options.sellerId));
  }
  if (options?.onlyAvailable) {
    filters.push(where("isAvailable", "==", true));
  }
  if (filters.length === 0) {
    return query(
      base,
      orderBy("createdAt", "desc"),
      limit(options?.limit ?? 50),
    );
  }
  if (options?.limit) {
    return query(base, ...filters, limit(options.limit));
  }
  return query(base, ...filters);
}

export function subscribeToListings(
  callback: ListingsCallback,
  options?: { sellerId?: string; limit?: number; onlyAvailable?: boolean },
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    buildListingQuery(options),
    (snapshot) => {
      const listings = snapshot.docs
        .map((entry) =>
          mapListingDoc({
            id: entry.id,
            ...(entry.data() as Record<string, unknown>),
          } as never),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      callback(options?.limit ? listings.slice(0, options.limit) : listings);
    },
    (error) => {
      console.error("Listings listener error", error);
      callback([]);
    },
  );
}

export function subscribeToListingById(
  listingId: string,
  callback: (listing: ListingItem | null) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, "listings", listingId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(
        mapListingDoc({
          id: snapshot.id,
          ...(snapshot.data() as Record<string, unknown>),
        } as never),
      );
    },
    (error) => {
      console.error("Listing listener error", error);
      callback(null);
    },
  );
}

export async function createListing(input: ListingInput): Promise<string> {
  const imageUrl = resolveListingImageUrl({
    imageUrl: input.imageUrl,
    images: input.images,
    title: input.title,
    category: input.category,
  });
  const status =
    input.status ?? (input.isAvailable === false ? "sold" : "active");
  const courseCode = input.courseCode?.trim();
  const courseTitle = input.courseTitle?.trim();
  const subcategory = input.subcategory?.trim();
  const listingRef = await addDoc(
    collection(db, "listings"),
    sanitizeListingPayload({
      ...input,
      id: "",
      imageUrl,
      images: input.images?.filter(Boolean) ?? [imageUrl],
      interestedCount: 0,
      likesCount: 0,
      savesCount: 0,
      interestedUsers: [],
      isAvailable: input.isAvailable ?? true,
      status,
      courseCode: courseCode || undefined,
      courseTitle: courseTitle || undefined,
      subcategory: subcategory || undefined,
      relatedCourseCodes: input.relatedCourseCodes?.filter(Boolean) ?? [],
      tags: input.tags?.filter(Boolean) ?? [],
      createdAt: serverTimestamp(),
    }),
  );

  await updateDoc(listingRef, { id: listingRef.id });
  return listingRef.id;
}

export async function updateListing(
  id: string,
  input: ListingUpdateInput,
): Promise<void> {
  const imageUrl = resolveListingImageUrl({
    imageUrl: input.imageUrl,
    images: input.images,
    title: input.title,
    category: input.category,
  });
  const status =
    input.status ?? (input.isAvailable === false ? "sold" : undefined);
  const courseCode = input.courseCode?.trim();
  const courseTitle = input.courseTitle?.trim();
  const subcategory = input.subcategory?.trim();
  await updateDoc(
    doc(db, "listings", id),
    sanitizeListingPayload({
      ...input,
      imageUrl,
      images: input.images?.filter(Boolean) ?? [imageUrl],
      courseCode: courseCode || undefined,
      courseTitle: courseTitle || undefined,
      subcategory: subcategory || undefined,
      relatedCourseCodes: input.relatedCourseCodes?.filter(Boolean) ?? [],
      tags: input.tags?.filter(Boolean) ?? [],
      ...(status ? { status } : {}),
    }),
  );
}

export async function syncListingSellerName(
  sellerId: string,
  sellerName: string,
): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, "listings"), where("sellerId", "==", sellerId)),
  );
  const batch = writeBatch(db);

  snapshot.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    if (data.sellerName !== sellerName) {
      batch.update(entry.ref, {
        sellerName,
      });
    }
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

export async function deleteListing(id: string): Promise<void> {
  await deleteDoc(doc(db, "listings", id));
}

export async function incrementListingInterestCount(
  listingId: string,
  delta: number,
): Promise<void> {
  await updateDoc(doc(db, "listings", listingId), {
    interestedCount: increment(delta),
  });
}
