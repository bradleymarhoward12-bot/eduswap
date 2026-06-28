import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured, mapNotificationDoc } from "@/services/firebase";
import type { Notification } from "@/types";

export interface NotificationInput {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  relatedId: string;
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(collection(db, "notifications"), where("userId", "==", userId)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((entry) => mapNotificationDoc({ id: entry.id, ...(entry.data() as Record<string, unknown>) } as never))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      );
    }, (error) => {
      console.error("Notifications listener error", error);
      callback([]);
    },
  );
}

export async function createNotification(input: NotificationInput): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "notifications"), {
      ...input,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.warn("Notification write skipped", error);
    return "";
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { isRead: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const snapshot = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId)));
  const batch = writeBatch(db);
  snapshot.docs.forEach((entry) => {
    const data = entry.data() as Record<string, unknown>;
    if (data.isRead === false) {
      batch.update(entry.ref, { isRead: true });
    }
  });
  await batch.commit();
}
