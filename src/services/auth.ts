import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  auth,
  db,
  initialsFromName,
  isFirebaseConfigured,
  mapUserDoc,
} from "@/services/firebase";
import { validateInstitutionEmail } from "@/utils/validateInstitutionEmail";
import type { User } from "@/types";

export interface AuthResult {
  user: User;
  token: string;
}

export interface UserProfileInput {
  name: string;
  email: string;
  universityCode?: string;
  institutionalEmail?: string;
  isVerifiedStudent?: boolean;
  role?: string;
  avatar?: string;
  university?: string;
}

function normalizeName(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("@")) {
    return "";
  }
  return trimmed;
}

function normalizeEmail(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function describeAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account was found for that email.";
    case "auth/wrong-password":
      return "The password you entered is incorrect.";
    case "auth/weak-password":
      return "Please choose a stronger password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "A network error occurred. Please check your connection and try again.";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Please try again.";
  }
}

async function ensureUserProfile(
  firebaseUser: FirebaseUser,
  profile?: Partial<UserProfileInput>,
): Promise<User> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const profileName = normalizeName(profile?.name);
  const displayName = normalizeName(firebaseUser.displayName);
  const storedFullName = snapshot.exists()
    ? normalizeName(
        (snapshot.data() as Record<string, unknown>).fullName as
          | string
          | undefined,
      ) ||
      normalizeName(
        (snapshot.data() as Record<string, unknown>).name as string | undefined,
      )
    : "";
  const persistedName = storedFullName || profileName || displayName || "";
  const resolvedName = persistedName || "there";
  const storedData = snapshot.exists()
    ? (snapshot.data() as Record<string, unknown>)
    : {};
  const resolvedInstitutionalEmail =
    normalizeEmail(
      (storedData.institutionalEmail as string | undefined) ?? null,
    ) ||
    normalizeEmail(firebaseUser.email) ||
    normalizeEmail(profile?.institutionalEmail) ||
    normalizeEmail(profile?.email) ||
    "";

  if (!snapshot.exists()) {
    const userDoc = {
      id: firebaseUser.uid,
      email: resolvedInstitutionalEmail,
      institutionalEmail: resolvedInstitutionalEmail,
      universityCode: profile?.universityCode ?? "",
      isVerifiedStudent: profile?.isVerifiedStudent ?? false,
      fullName: persistedName,
      name: persistedName,
      avatar: profile?.avatar ?? firebaseUser.photoURL ?? "",
      initials: initialsFromName(resolvedName),
      university: profile?.university ?? "",
      role: profile?.role ?? "student",
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, userDoc);
    return mapUserDoc({
      ...userDoc,
      createdAt: new Date().toISOString(),
    });
  }

  const data = storedData;
  const name = resolvedName;
  const mergedUser = mapUserDoc({
    id: firebaseUser.uid,
    email: resolvedInstitutionalEmail,
    institutionalEmail:
      (data.institutionalEmail as string | undefined) ??
      resolvedInstitutionalEmail,
    universityCode:
      (data.universityCode as string | undefined) ??
      profile?.universityCode ??
      "",
    isVerifiedStudent:
      (data.isVerifiedStudent as boolean | undefined) ??
      Boolean(
        (data.institutionalEmail as string | undefined) ??
        data.email ??
        resolvedInstitutionalEmail,
      ),
    fullName: name,
    name,
    avatar:
      (data.avatar as string | undefined) ??
      profile?.avatar ??
      firebaseUser.photoURL ??
      "",
    initials: (data.initials as string | undefined) ?? initialsFromName(name),
    university:
      (data.university as string | undefined) ?? profile?.university ?? "",
    role: (data.role as string | undefined) ?? profile?.role ?? "student",
    createdAt: data.createdAt as any,
  });

  await setDoc(
    userRef,
    {
      id: mergedUser.id,
      email: mergedUser.email,
      institutionalEmail: mergedUser.institutionalEmail,
      universityCode: mergedUser.universityCode,
      isVerifiedStudent: mergedUser.isVerifiedStudent,
      fullName: mergedUser.fullName,
      name: mergedUser.name,
      avatar: mergedUser.avatar ?? "",
      initials: mergedUser.initials,
      university: mergedUser.university,
      role: (data.role as string | undefined) ?? profile?.role ?? "student",
      createdAt: data.createdAt ?? serverTimestamp(),
    },
    { merge: true },
  );

  return mergedUser;
}

async function getFirebaseToken(firebaseUser: FirebaseUser): Promise<string> {
  return firebaseUser.getIdToken();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await ensureUserProfile(credential.user);
  return { user, token: await getFirebaseToken(credential.user) };
}

export async function signup(
  name: string,
  email: string,
  password: string,
  universityCode: string,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  if (!validateInstitutionEmail(email, universityCode)) {
    throw new Error("INVALID_INSTITUTIONAL_EMAIL");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await updateProfile(credential.user, { displayName: name });
  const user = await ensureUserProfile(credential.user, {
    name,
    email,
    institutionalEmail: email,
    universityCode,
    isVerifiedStudent: true,
  });
  return { user, token: await getFirebaseToken(credential.user) };
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getCurrentUserProfile(
  firebaseUser: FirebaseUser,
): Promise<User> {
  return ensureUserProfile(firebaseUser);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export { onAuthStateChanged, describeAuthError };
