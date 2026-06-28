import fs from "node:fs";
import process from "node:process";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { doc, getFirestore, setDoc, Timestamp } from "firebase-admin/firestore";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

if (!getApps().length) {
  const serviceAccount = getServiceAccount();
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  });
}

const db = getFirestore();

const users = [
  {
    id: "user_1",
    email: "alex@ndkc.edu.ph",
    institutionalEmail: "alex@ndkc.edu.ph",
    universityCode: "NDKC",
    isVerifiedStudent: true,
    fullName: "Alex Johnson",
    name: "Alex Johnson",
    avatar: "",
    initials: "AJ",
    university: "State University",
    role: "student",
    createdAt: Timestamp.fromDate(new Date("2026-05-01T08:00:00Z")),
  },
  {
    id: "user_2",
    email: "sarah@ndkc.edu.ph",
    institutionalEmail: "sarah@ndkc.edu.ph",
    universityCode: "NDKC",
    isVerifiedStudent: true,
    fullName: "Sarah Chen",
    name: "Sarah Chen",
    avatar: "",
    initials: "SC",
    university: "State University",
    role: "student",
    createdAt: Timestamp.fromDate(new Date("2026-05-02T08:00:00Z")),
  },
  {
    id: "user_3",
    email: "alan@ndkc.edu.ph",
    institutionalEmail: "alan@ndkc.edu.ph",
    universityCode: "NDKC",
    isVerifiedStudent: true,
    fullName: "Dr. Alan Turing",
    name: "Dr. Alan Turing",
    avatar: "",
    initials: "AT",
    university: "State University",
    role: "tutor",
    createdAt: Timestamp.fromDate(new Date("2026-05-03T08:00:00Z")),
  },
];

const listings = [
  {
    id: "item_1",
    title: "Calculus Early Transcendentals 8th Edition",
    description: "Used textbook in good condition.",
    price: 45,
    category: "Books",
    condition: "Good",
    sellerId: "user_2",
    sellerName: "Sarah Chen",
    sellerAvatar: "",
    imageUrl: "https://picsum.photos/seed/listing1/800/600",
    images: ["https://picsum.photos/seed/listing1/800/600"],
    interestedCount: 3,
    isAvailable: true,
    createdAt: Timestamp.fromDate(new Date("2026-06-01T08:00:00Z")),
  },
  {
    id: "item_2",
    title: "TI-84 Plus CE Graphing Calculator",
    description: "Works perfectly. Comes with charging cable.",
    price: 85,
    category: "Electronics",
    condition: "Like New",
    sellerId: "user_1",
    sellerName: "Alex Johnson",
    sellerAvatar: "",
    imageUrl: "https://picsum.photos/seed/listing2/800/600",
    images: ["https://picsum.photos/seed/listing2/800/600"],
    interestedCount: 7,
    isAvailable: true,
    createdAt: Timestamp.fromDate(new Date("2026-06-05T08:00:00Z")),
  },
];

const tutors = [
  {
    id: "user_3",
    userId: "user_3",
    fullName: "Dr. Alan Turing",
    name: "Dr. Alan Turing",
    displayName: "Dr. Alan Turing",
    avatar: "",
    bio: "PhD student in Computer Science. Algorithms, data structures, and interview prep.",
    courses: [
      { code: "IT 211", title: "Data Structures and Algorithms" },
      { code: "MATH GEN", title: "General Mathematics" },
      { code: "CS 101", title: "Introduction to Programming" },
    ],
    hourlyRate: 40,
    availability: ["Monday 3pm-5pm", "Wednesday 10am-1pm"],
    rating: 4.9,
    reviewCount: 12,
    isAvailable: true,
    createdAt: Timestamp.fromDate(new Date("2026-05-03T08:00:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-06-10T08:00:00Z")),
  },
];

const chats = [
  {
    id: "conv_1",
    participants: ["user_1", "user_2"],
    participantDetails: [
      {
        id: "user_1",
        fullName: "Alex Johnson",
        name: "Alex Johnson",
        email: "alex@ndkc.edu.ph",
        avatar: "",
        initials: "AJ",
        university: "State University",
        joinedAt: "2026-05-01T08:00:00Z",
      },
      {
        id: "user_2",
        fullName: "Sarah Chen",
        name: "Sarah Chen",
        email: "sarah@ndkc.edu.ph",
        avatar: "",
        initials: "SC",
        university: "State University",
        joinedAt: "2026-05-02T08:00:00Z",
      },
    ],
    unreadCounts: { user_1: 1, user_2: 0 },
    lastMessage: {
      id: "msg_1",
      senderId: "user_2",
      content: "Is the textbook still available?",
      timestamp: "2026-06-20T08:00:00.000Z",
      isRead: false,
    },
    updatedAt: Timestamp.fromDate(new Date("2026-06-20T08:00:00Z")),
  },
];

const messages = [
  {
    id: "msg_1",
    text: "Is the textbook still available?",
    senderId: "user_2",
    createdAt: Timestamp.fromDate(new Date("2026-06-20T08:00:00Z")),
  },
];

const notifications = [
  {
    id: "notif_1",
    userId: "user_1",
    type: "interest",
    title: "New Interest in your Listing",
    body: "Someone is interested in your calculus textbook.",
    relatedId: "item_1",
    isRead: false,
    createdAt: Timestamp.fromDate(new Date("2026-06-20T09:00:00Z")),
  },
];

const interests = [
  {
    id: "req_1",
    userId: "user_3",
    targetId: "item_1",
    type: "listing",
    studentId: "user_1",
    studentName: "Alex Johnson",
    contextLabel: "Books",
    status: "pending",
    targetName: "Calculus Early Transcendentals 8th Edition",
    message: "Interested in the textbook.",
    createdAt: Timestamp.fromDate(new Date("2026-06-20T09:00:00Z")),
  },
];

async function seedCollection(collectionName, records) {
  for (const record of records) {
    const { id, ...data } = record;
    await setDoc(doc(db, collectionName, id), data, { merge: true });
  }
}

async function seedChat(chat) {
  const { id, ...data } = chat;
  const chatRef = doc(db, "chats", id);
  await setDoc(chatRef, data, { merge: true });
  for (const message of messages) {
    await setDoc(doc(db, "chats", id, "messages", message.id), message, { merge: true });
  }
}

async function main() {
  await seedCollection("users", users);
  await seedCollection("listings", listings);
  await seedCollection("tutors", tutors);
  await seedCollection("notifications", notifications);
  await seedCollection("interests", interests);
  for (const chat of chats) {
    await seedChat(chat);
  }
  console.log("Firestore seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
