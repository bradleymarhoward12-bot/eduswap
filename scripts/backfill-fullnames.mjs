import process from "node:process";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from "firebase-admin/firestore";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

function normalizeName(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.includes("@")) {
    return "";
  }
  return trimmed;
}

function localPart(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || !trimmed.includes("@")) {
    return "";
  }
  return trimmed.split("@")[0] ?? "";
}

function resolveName(...values) {
  for (const value of values) {
    const normalized = normalizeName(value);
    if (normalized) {
      return normalized;
    }
  }

  for (const value of values) {
    const fallback = localPart(value);
    if (fallback) {
      return fallback;
    }
  }

  return "";
}

function initialsFromName(name) {
  const value = normalizeName(name);
  if (!value) {
    return "ED";
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

if (!getApps().length) {
  const serviceAccount = getServiceAccount();
  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  });
}

const db = getFirestore();
const dryRun = process.argv.includes("--dry-run");

async function commitIfNeeded(state) {
  if (dryRun || state.pending === 0) {
    return;
  }

  await state.batch.commit();
  state.batch = writeBatch(db);
  state.pending = 0;
}

async function backfillUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  let updated = 0;
  const state = { batch: writeBatch(db), pending: 0 };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const currentFullName = normalizeName(data.fullName);
    const nextFullName = resolveName(currentFullName, data.name, data.displayName, data.email);

    if (!nextFullName || nextFullName === currentFullName) {
      continue;
    }

    updated += 1;
    if (!dryRun) {
      state.batch.set(
        doc(db, "users", docSnap.id),
        {
          fullName: nextFullName,
          name: nextFullName,
          initials: data.initials ?? initialsFromName(nextFullName),
        },
        { merge: true },
      );
      state.pending += 1;
      if (state.pending >= 450) {
        await commitIfNeeded(state);
      }
    }
  }

  await commitIfNeeded(state);

  return updated;
}

async function backfillTutors(userNameById) {
  const snapshot = await getDocs(collection(db, "tutors"));
  let updated = 0;
  const state = { batch: writeBatch(db), pending: 0 };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const userName = userNameById.get(data.userId);
    const currentFullName = normalizeName(data.fullName) || normalizeName(data.displayName) || normalizeName(data.name);
    const nextFullName = resolveName(currentFullName, userName);

    if (!nextFullName || nextFullName === currentFullName) {
      continue;
    }

    updated += 1;
    if (!dryRun) {
      state.batch.set(
        doc(db, "tutors", docSnap.id),
        {
          fullName: nextFullName,
          name: nextFullName,
          displayName: nextFullName,
        },
        { merge: true },
      );
      state.pending += 1;
      if (state.pending >= 450) {
        await commitIfNeeded(state);
      }
    }
  }

  await commitIfNeeded(state);

  return updated;
}

async function backfillChats(userNameById) {
  const snapshot = await getDocs(collection(db, "chats"));
  let updated = 0;
  const state = { batch: writeBatch(db), pending: 0 };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const participantDetails = Array.isArray(data.participantDetails) ? data.participantDetails : [];
    const nextParticipantDetails = participantDetails.map((participant) => {
      const resolved = resolveName(participant.fullName, participant.name, userNameById.get(participant.id));
      if (!resolved) {
        return participant;
      }

      return {
        ...participant,
        fullName: resolved,
        name: resolved,
      };
    });

    const changed = JSON.stringify(nextParticipantDetails) !== JSON.stringify(participantDetails);
    if (!changed) {
      continue;
    }

    updated += 1;
    if (!dryRun) {
      state.batch.set(
        doc(db, "chats", docSnap.id),
        {
          participantDetails: nextParticipantDetails,
        },
        { merge: true },
      );
      state.pending += 1;
      if (state.pending >= 450) {
        await commitIfNeeded(state);
      }
    }
  }

  await commitIfNeeded(state);

  return updated;
}

async function backfillListings(userNameById) {
  const snapshot = await getDocs(collection(db, "listings"));
  let updated = 0;
  const state = { batch: writeBatch(db), pending: 0 };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const sellerName = normalizeName(data.sellerName);
    const resolvedSellerName = resolveName(sellerName, userNameById.get(data.sellerId));

    if (!resolvedSellerName || resolvedSellerName === sellerName) {
      continue;
    }

    updated += 1;
    if (!dryRun) {
      state.batch.set(
        doc(db, "listings", docSnap.id),
        {
          sellerName: resolvedSellerName,
        },
        { merge: true },
      );
      state.pending += 1;
      if (state.pending >= 450) {
        await commitIfNeeded(state);
      }
    }
  }

  await commitIfNeeded(state);
  return updated;
}

async function backfillNotifications(userNameById) {
  const snapshot = await getDocs(collection(db, "notifications"));
  let updated = 0;
  const state = { batch: writeBatch(db), pending: 0 };

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const recipientName = resolveName(userNameById.get(data.userId));
    const currentBody = typeof data.body === "string" ? data.body : "";
    const currentTitle = typeof data.title === "string" ? data.title : "";
    const hasPlaceholder = /EduSwap User/i.test(currentBody) || /EduSwap User/i.test(currentTitle);

    if (!recipientName || !hasPlaceholder) {
      continue;
    }

    const nextTitle = currentTitle.replace(/EduSwap User/gi, recipientName);
    const nextBody = currentBody.replace(/EduSwap User/gi, recipientName);

    if (nextTitle === currentTitle && nextBody === currentBody) {
      continue;
    }

    updated += 1;
    if (!dryRun) {
      state.batch.set(
        doc(db, "notifications", docSnap.id),
        {
          title: nextTitle,
          body: nextBody,
        },
        { merge: true },
      );
      state.pending += 1;
      if (state.pending >= 450) {
        await commitIfNeeded(state);
      }
    }
  }

  await commitIfNeeded(state);
  return updated;
}

async function main() {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const userNameById = new Map();

  for (const docSnap of usersSnapshot.docs) {
    const data = docSnap.data();
    const name = resolveName(data.fullName, data.name, data.displayName, data.email);
    if (name) {
      userNameById.set(docSnap.id, name);
    }
  }

  const usersUpdated = await backfillUsers();
  const tutorsUpdated = await backfillTutors(userNameById);
  const chatsUpdated = await backfillChats(userNameById);
  const listingsUpdated = await backfillListings(userNameById);
  const notificationsUpdated = await backfillNotifications(userNameById);

  const mode = dryRun ? "dry-run" : "write";
  console.log(
    `Backfill complete (${mode}). users=${usersUpdated}, tutors=${tutorsUpdated}, chats=${chatsUpdated}, listings=${listingsUpdated}, notifications=${notificationsUpdated}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
