import {
  collection,
  deleteDoc,
  doc,
  arrayRemove,
  arrayUnion,
  increment,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
  where,
  type Unsubscribe,
  setDoc,
  query,
} from "firebase/firestore";
import { db, isFirebaseConfigured, timestampToIso } from "@/services/firebase";

export interface InterestRecord {
  id: string;
  userId: string;
  targetId: string;
  type: string;
  createdAt: string;
  studentId?: string;
  studentName?: string;
  contextLabel?: string;
  status?: string;
  targetName?: string;
  message?: string;
  courseCode?: string;
  courseTitle?: string;
}

export interface SavedItemRecord {
  id: string;
  userId: string;
  itemId: string;
  type: string;
  createdAt: string;
}

export interface InterestInput {
  userId: string;
  targetId: string;
  type: string;
  studentId?: string;
  studentName?: string;
  contextLabel?: string;
  status?: string;
  targetName?: string;
  message?: string;
  courseCode?: string;
  courseTitle?: string;
}

function interestDocId(userId: string, targetId: string, type: string) {
  return `${type}:${userId}:${targetId}`;
}

function savedItemDocId(userId: string, targetId: string) {
  return `listing:${userId}:${targetId}`;
}

function savedItemsCollection() {
  return collection(db, "savedItems");
}

export function subscribeToInterests(
  userId: string,
  callback: (interests: InterestRecord[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db, "interests"), where("userId", "==", userId)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((entry) => {
            const data = entry.data() as Record<string, unknown>;
            return {
              id: entry.id,
              userId: (data.userId as string | undefined) ?? "",
              targetId: (data.targetId as string | undefined) ?? "",
              type: (data.type as string | undefined) ?? "",
              createdAt: timestampToIso(data.createdAt as never),
              studentId: data.studentId as string | undefined,
              studentName: data.studentName as string | undefined,
              contextLabel: data.contextLabel as string | undefined,
              status: data.status as string | undefined,
              targetName: data.targetName as string | undefined,
              message: data.message as string | undefined,
              courseCode: data.courseCode as string | undefined,
              courseTitle: data.courseTitle as string | undefined,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
    },
    (error) => {
      console.error("Interests listener error", error);
      callback([]);
    },
  );
}

export function subscribeToSavedItems(
  userId: string,
  callback: (savedItems: SavedItemRecord[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(savedItemsCollection(), where("userId", "==", userId)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((entry) => {
            const data = entry.data() as Record<string, unknown>;
            return {
              id: entry.id,
              userId: (data.userId as string | undefined) ?? "",
              itemId: (data.itemId as string | undefined) ?? "",
              type: (data.type as string | undefined) ?? "",
              createdAt: timestampToIso(data.createdAt as never),
            };
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );
    },
    (error) => {
      console.error("Saved items listener error", error);
      callback([]);
    },
  );
}

export async function addInterest(input: InterestInput): Promise<string> {
  const id = interestDocId(input.userId, input.targetId, input.type);
  const ref = doc(db, "interests", id);
  const existing = await getDoc(ref);

  await setDoc(
    ref,
    {
      id,
      ...input,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (input.type === "listing") {
    const savedItemRef = doc(
      db,
      "savedItems",
      savedItemDocId(input.userId, input.targetId),
    );
    await setDoc(
      savedItemRef,
      {
        id: savedItemRef.id,
        userId: input.userId,
        itemId: input.targetId,
        type: "listing",
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (input.type === "listing" && !existing.exists()) {
    await updateDoc(doc(db, "listings", input.targetId), {
      interestedCount: increment(1),
      savesCount: increment(1),
      likesCount: increment(1),
      interestedUsers: arrayUnion(input.userId),
      latestInterestAt: serverTimestamp(),
    });
  }

  return id;
}

export async function removeInterest(
  userId: string,
  targetId: string,
  type: string,
): Promise<void> {
  const id = interestDocId(userId, targetId, type);
  const ref = doc(db, "interests", id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return;
  }

  await deleteDoc(ref);

  if (type === "listing") {
    await deleteDoc(doc(db, "savedItems", savedItemDocId(userId, targetId)));
    await updateDoc(doc(db, "listings", targetId), {
      interestedCount: increment(-1),
      savesCount: increment(-1),
      likesCount: increment(-1),
      interestedUsers: arrayRemove(userId),
    });
  }
}
