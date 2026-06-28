import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured, mapTutorRequestDoc, mapUserDoc } from "@/services/firebase";
import { createNotification } from "@/services/notifications";
import { getCourseResources } from "@/services/recommendations";
import { formatTutorCourse } from "@/utils/tutorCourses";
import type { TutorCourse, TutorRequest, User } from "@/types";

export interface TutorRequestInput {
  tutorId: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  message: string;
  chatId: string;
}

export type TutorRequestRecord = TutorRequest;

export interface TutorRequestContext {
  id: string;
  tutorId: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  message: string;
  status: TutorRequest["status"];
  chatId: string;
}

type TutorRequestsCallback = (requests: TutorRequest[]) => void;

function tutorRequestsCollection() {
  return collection(db, "tutorRequests");
}

function requestMessageDoc(chatId: string, requestId: string) {
  return doc(db, "chats", chatId, "messages", requestId);
}

function recommendationMessageDoc(chatId: string, requestId: string) {
  return doc(db, "chats", chatId, "messages", `${requestId}:recommendations`);
}

export function subscribeToTutorRequests(
  tutorId: string,
  callback: TutorRequestsCallback,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    query(tutorRequestsCollection(), where("tutorId", "==", tutorId)),
    (snapshot) => {
      callback(
        snapshot.docs.map((entry) =>
          mapTutorRequestDoc({ id: entry.id, ...(entry.data() as Record<string, unknown>) } as never),
        ),
      );
    },
    (error) => {
      console.error("Tutor requests listener error", error);
      callback([]);
    },
  );
}

async function getUserSnapshot(userId: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) {
    return null;
  }

  return mapUserDoc({ id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as never);
}

export async function createTutorRequest(input: TutorRequestInput): Promise<TutorRequest> {
  const requestRef = await addDoc(tutorRequestsCollection(), {
    tutorId: input.tutorId,
    studentId: input.studentId,
    studentName: input.studentName,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    message: input.message,
    status: "pending",
    chatId: input.chatId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const requestId = requestRef.id;
  const createdAt = new Date().toISOString();
  const summary = formatTutorCourse({ code: input.courseCode, title: input.courseTitle });
  const chatSnapshot = await getDoc(doc(db, "chats", input.chatId));
  const existingUnreadCounts =
    chatSnapshot.exists() && (chatSnapshot.data().unreadCounts as Record<string, number> | undefined)
      ? (chatSnapshot.data().unreadCounts as Record<string, number>)
      : {};

  await setDoc(requestMessageDoc(input.chatId, requestId), {
    id: requestId,
    conversationId: input.chatId,
    senderId: input.studentId,
    type: "tutor_request",
    requestId,
    tutorId: input.tutorId,
    studentId: input.studentId,
    studentName: input.studentName,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    status: "pending",
    message: input.message,
    content: input.message,
    receiverId: input.tutorId,
    text: input.message,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "chats", input.chatId), {
    lastMessage: {
      id: requestId,
      senderId: input.studentId,
      content: `Tutor request: ${summary}`,
      timestamp: createdAt,
      isRead: false,
    },
    unreadCounts: {
      ...existingUnreadCounts,
      [input.studentId]: 0,
      [input.tutorId]: (existingUnreadCounts[input.tutorId] ?? 0) + 1,
    },
    contextCourse: {
      code: input.courseCode,
      title: input.courseTitle,
    } as TutorCourse,
    updatedAt: serverTimestamp(),
  });

  const resources = await getCourseResources(input.courseCode);

  if (resources.length > 0) {
    await setDoc(recommendationMessageDoc(input.chatId, requestId), {
      id: `${requestId}:recommendations`,
      conversationId: input.chatId,
      senderId: input.studentId,
      type: "course_recommendation",
      courseCode: input.courseCode,
      resources,
      text: `Course resources for ${summary}`,
      content: `Course resources for ${summary}`,
      receiverId: input.studentId,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", input.chatId), {
      lastMessage: {
        id: `${requestId}:recommendations`,
        senderId: "system",
        content: `Course resources shared for ${summary}`,
        timestamp: new Date().toISOString(),
        isRead: false,
      },
      updatedAt: serverTimestamp(),
    });
  }

  const studentProfile = await getUserSnapshot(input.studentId);
  const studentDisplayName = studentProfile?.fullName || input.studentName;

  await createNotification({
    userId: input.tutorId,
    type: "chat",
    title: "New tutor request",
    body: `${studentDisplayName} requested help for ${summary}.`,
    relatedId: requestId,
  });

  return mapTutorRequestDoc({
    id: requestId,
    tutorId: input.tutorId,
    studentId: input.studentId,
    studentName: input.studentName,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    message: input.message,
    status: "pending",
    chatId: input.chatId,
    createdAt,
    updatedAt: createdAt,
  });
}

export async function updateTutorRequestStatus(
  requestId: string,
  status: Exclude<TutorRequest["status"], "pending">,
): Promise<void> {
  const requestRef = doc(db, "tutorRequests", requestId);
  const requestSnapshot = await getDoc(requestRef);
  if (!requestSnapshot.exists()) {
    throw new Error("Tutor request not found.");
  }

  const requestData = mapTutorRequestDoc({
    id: requestSnapshot.id,
    ...(requestSnapshot.data() as Record<string, unknown>),
  } as never);

  const nextStatus = status;
  const summary = formatTutorCourse({
    code: requestData.courseCode,
    title: requestData.courseTitle,
  });

  await updateDoc(requestRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(requestMessageDoc(requestData.chatId, requestId), {
    status: nextStatus,
    updatedAt: serverTimestamp(),
    content:
      nextStatus === "accepted"
        ? `Request accepted for ${summary}`
        : `Request rejected for ${summary}`,
  });

  await updateDoc(doc(db, "chats", requestData.chatId), {
    lastMessage: {
      id: requestId,
      senderId: requestData.tutorId,
      content:
        nextStatus === "accepted"
          ? `Request accepted for ${summary}`
          : `Request rejected for ${summary}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    },
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: requestData.studentId,
    type: "chat",
    title:
      nextStatus === "accepted"
        ? "Tutor request accepted"
        : "Tutor request rejected",
    body:
      nextStatus === "accepted"
        ? `Your request for ${summary} has been accepted.`
        : `Your request for ${summary} has been rejected.`,
    relatedId: requestId,
  });
}
