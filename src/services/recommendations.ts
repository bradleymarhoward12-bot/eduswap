import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  db,
  isFirebaseConfigured,
  mapCourseResourceDoc,
  mapListingDoc,
} from "@/services/firebase";
import type { CourseResource, ListingItem, UserActivity } from "@/types";

interface RelatedListingCacheEntry {
  listingId: string;
  cacheKey: string;
  items: ListingItem[];
  createdAt: number;
}

interface RelatedListingFilters {
  currentListingId: string;
  courseCode?: string;
  category?: string;
  title?: string;
  subcategory?: string;
  courseTitle?: string;
  tags?: string[];
  price?: number;
  condition?: string;
}

interface UserActivityInput {
  userId: string;
  type: UserActivity["type"];
  listingId: string;
  courseCode?: string;
}

const relatedListingCache = new Map<string, RelatedListingCacheEntry>();
const relatedListingCacheTtlMs = 5 * 60 * 1000;

const CURATED_LEARNING_RESOURCES: Array<{
  keywords: string[];
  resources: CourseResource[];
}> = [
  {
    keywords: ["machine learning", "ml", "ai", "artificial intelligence", "data science"],
    resources: [
      {
        id: "ml-1",
        courseCode: "ML101",
        title: "Hands-On Machine Learning",
        description: "A practical starter for supervised learning, model evaluation, and pipelines.",
        type: "book",
      },
      {
        id: "ml-2",
        courseCode: "ML101",
        title: "FastAI Study Notes",
        description: "Short notes that break down key machine learning concepts into reviewable chunks.",
        type: "notes",
      },
    ],
  },
  {
    keywords: ["programming", "coding", "software", "computer science", "python", "java"],
    resources: [
      {
        id: "cs-1",
        courseCode: "CS101",
        title: "Clean Code Fundamentals",
        description: "A structured reference for building maintainable code and improving debugging habits.",
        type: "book",
      },
      {
        id: "cs-2",
        courseCode: "CS101",
        title: "Programming Practice Pack",
        description: "Exercises and notes for strengthening logic, syntax, and problem-solving.",
        type: "reviewer",
      },
    ],
  },
  {
    keywords: ["calculus", "math", "mathematics", "algebra", "statistics"],
    resources: [
      {
        id: "math-1",
        courseCode: "MATH101",
        title: "Calculus Quick Review",
        description: "Formula-driven notes for limits, derivatives, and integrals.",
        type: "notes",
      },
      {
        id: "math-2",
        courseCode: "MATH101",
        title: "Campus Math Problem Set",
        description: "A focused problem set with worked examples for weekly review.",
        type: "reviewer",
      },
    ],
  },
  {
    keywords: ["business", "accounting", "finance", "economics", "management"],
    resources: [
      {
        id: "biz-1",
        courseCode: "BUS101",
        title: "Business Essentials",
        description: "A concise guide for core business concepts, accounting basics, and case review.",
        type: "book",
      },
      {
        id: "biz-2",
        courseCode: "BUS101",
        title: "Revision Sheets",
        description: "Fast-review notes for exam prep and key definitions.",
        type: "notes",
      },
    ],
  },
];

function relatedCacheKey(input: RelatedListingFilters) {
  return JSON.stringify({
    courseCode: input.courseCode ?? "",
    category: input.category ?? "",
    title: input.title ?? "",
    subcategory: input.subcategory ?? "",
    courseTitle: input.courseTitle ?? "",
    tags: input.tags ?? [],
    currentListingId: input.currentListingId,
  });
}

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeCourseCode(courseCode?: string) {
  return courseCode?.trim().toUpperCase() ?? "";
}

function tokenize(...parts: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      parts
        .flatMap((part) =>
          (part ?? "")
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .map((token) => token.trim())
            .filter((token) => token.length > 2),
        ),
    ),
  );
}

function scoreListingMatch(listing: ListingItem, input: RelatedListingFilters) {
  const inputKeywords = tokenize(
    input.courseCode,
    input.category,
    input.title,
    input.subcategory,
    input.courseTitle,
    ...(input.tags ?? []),
  );

  const listingKeywords = tokenize(
    listing.courseCode,
    listing.courseTitle,
    listing.category,
    listing.subcategory,
    listing.title,
    listing.description,
    ...(listing.tags ?? []),
    ...(listing.relatedCourseCodes ?? []),
  );

  const title = normalize(listing.title);
  const courseTitle = normalize(listing.courseTitle);
  const category = normalize(listing.category);
  const subcategory = normalize(listing.subcategory);
  const listingCourseCode = normalize(listing.courseCode);
  const inputCourseCode = normalize(input.courseCode);
  const inputCategory = normalize(input.category);
  const inputTitle = normalize(input.title);
  const inputSubcategory = normalize(input.subcategory);

  let score = 0;

  if (inputCourseCode && listingCourseCode) {
    if (listingCourseCode === inputCourseCode) score += 100;
    else if (listingCourseCode.startsWith(inputCourseCode)) score += 70;
    else if (listingCourseCode.includes(inputCourseCode)) score += 50;
  }

  if (inputCategory && category === inputCategory) {
    score += 40;
  }

  if (inputSubcategory && subcategory === inputSubcategory) {
    score += 18;
  }

  if (inputTitle) {
    const titleTokens = tokenize(input.title);
    const overlap = titleTokens.filter((token) => listingKeywords.includes(token));
    score += overlap.length * 14;
  }

  const keywordOverlap = inputKeywords.filter((token) =>
    listingKeywords.includes(token),
  );
  score += keywordOverlap.length * 10;

  const titleOverlap = inputKeywords.filter(
    (token) => title.includes(token) || courseTitle.includes(token),
  );
  score += titleOverlap.length * 8;

  if (listing.category === input.category) {
    score += 8;
  }

  return score;
}

function pruneRelatedListingCache() {
  const cutoff = Date.now() - relatedListingCacheTtlMs;
  for (const [key, entry] of relatedListingCache.entries()) {
    if (entry.createdAt < cutoff) {
      relatedListingCache.delete(key);
    }
  }
}

function curatedResourcesForCourse(courseCode?: string, courseTitle?: string) {
  const haystack = `${courseCode ?? ""} ${courseTitle ?? ""}`.toLowerCase();
  const match = CURATED_LEARNING_RESOURCES.find((entry) =>
    entry.keywords.some((keyword) => haystack.includes(keyword)),
  );

  return (
    match?.resources ?? [
      {
        id: "study-1",
        courseCode: courseCode?.trim().toUpperCase() || "STUDY",
        title: "Study Guide Starter Pack",
        description:
          "A general-purpose review pack with notes, summaries, and practice prompts.",
        type: "notes",
      },
      {
        id: "study-2",
        courseCode: courseCode?.trim().toUpperCase() || "STUDY",
        title: "Practice Questions",
        description:
          "Use this as a quick refresher when you want a structured review session.",
        type: "reviewer",
      },
    ]
  );
}

export async function recordUserActivity(
  input: UserActivityInput,
): Promise<void> {
  if (!isFirebaseConfigured || !input.userId || !input.listingId) {
    return;
  }

  try {
    await addDoc(collection(db, "userActivity"), {
      userId: input.userId,
      type: input.type,
      listingId: input.listingId,
      courseCode: input.courseCode ?? "",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to record user activity", error);
  }
}

export async function getRelatedListings(
  input: RelatedListingFilters,
): Promise<ListingItem[]> {
  if (!isFirebaseConfigured || !input.currentListingId) {
    return [];
  }

  try {
    pruneRelatedListingCache();
    const cacheKey = relatedCacheKey(input);
    const cached = relatedListingCache.get(cacheKey);
    if (cached && cached.listingId === input.currentListingId) {
      return cached.items;
    }

    const queries = [];
    const normalizedCourseCode = normalizeCourseCode(input.courseCode);
    const normalizedCategory = normalize(input.category);

    if (normalizedCourseCode) {
      queries.push(
        getDocs(
          query(
            collection(db, "listings"),
            where("courseCode", "==", normalizedCourseCode),
            limit(15),
          ),
        ),
      );
    }

    if (normalizedCategory) {
      queries.push(
        getDocs(
          query(
            collection(db, "listings"),
            where("category", "==", input.category),
            limit(15),
          ),
        ),
      );
    }

    if (queries.length === 0) {
      queries.push(getDocs(query(collection(db, "listings"), limit(20))));
    }

    const snapshots = await Promise.all(queries);
    const candidateMap = new Map<string, ListingItem>();

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((entry) => {
        const listing = mapListingDoc({
          id: entry.id,
          ...(entry.data() as Record<string, unknown>),
        } as never);
        if (listing.id !== input.currentListingId) {
          candidateMap.set(listing.id, listing);
        }
      });
    });

    const candidates = Array.from(candidateMap.values()).filter(
      (listing) => listing.status === "active" || listing.isAvailable !== false,
    );

    const scored = candidates
      .map((listing) => ({
        listing,
        score: scoreListingMatch(listing, input),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (
          new Date(b.listing.createdAt).getTime() -
          new Date(a.listing.createdAt).getTime()
        );
      })
      .map(({ listing }) => listing)
      .slice(0, 6);

    relatedListingCache.set(cacheKey, {
      listingId: input.currentListingId,
      cacheKey,
      items: scored,
      createdAt: Date.now(),
    });

    return scored;
  } catch (error) {
    console.error("Failed to load related listings", error);
    return [];
  }
}

export async function getCourseResources(
  courseCode: string,
  courseTitle?: string,
): Promise<CourseResource[]> {
  if (!courseCode && !courseTitle) {
    return curatedResourcesForCourse(courseCode, courseTitle);
  }

  try {
    const normalizedCourseCode = normalizeCourseCode(courseCode);
    const snapshot = await getDocs(
      query(
        collection(db, "courseResources"),
        where("courseCode", "==", normalizedCourseCode),
        limit(5),
      ),
    );

    const firestoreResources = snapshot.docs
      .map((entry) =>
        mapCourseResourceDoc({
          id: entry.id,
          ...(entry.data() as Record<string, unknown>),
        } as never),
      )
      .filter((resource) => Boolean(resource.title && resource.description));

    if (firestoreResources.length > 0) {
      return firestoreResources;
    }
  } catch (error) {
    console.error("Failed to load course resources", error);
  }

  return curatedResourcesForCourse(courseCode, courseTitle);
}
