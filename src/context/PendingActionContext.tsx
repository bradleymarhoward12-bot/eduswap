import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import type { PendingAction } from "@/types";

interface PendingActionContextType {
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  clearPendingAction: () => void;
}

const PendingActionContext = createContext<
  PendingActionContextType | undefined
>(undefined);

const STORAGE_KEY = "pendingAction";

export function PendingActionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [pendingAction, setPendingActionState] = useState<PendingAction | null>(
    null,
  );
  const hasExecutedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PendingAction;
        setPendingActionState(parsed);
      }
    } catch (error) {
      console.error("Failed to load pending marketplace action", error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setPendingAction = (action: PendingAction | null) => {
    if (action) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(action));
      hasExecutedRef.current = false;
      setPendingActionState(action);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    hasExecutedRef.current = false;
    setPendingActionState(null);
  };

  const clearPendingAction = () => setPendingAction(null);

  const executePendingAction = () => {
    const currentAction = pendingAction;
    if (!currentAction || hasExecutedRef.current || !user) {
      return;
    }

    hasExecutedRef.current = true;

    switch (currentAction.type) {
      case "save":
      case "offer":
      case "message":
        if (currentAction.listingId) {
          setLocation(`/item/${currentAction.listingId}`);
        }
        break;
      case "viewTutor":
      case "requestTutor":
        setLocation(`/tutors/tutor/${currentAction.tutorId}`);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!isHydrated || !user || !pendingAction) {
      return;
    }
    executePendingAction();
  }, [isHydrated, user, pendingAction]);

  const value = useMemo(
    () => ({ pendingAction, setPendingAction, clearPendingAction }),
    [pendingAction],
  );

  return (
    <PendingActionContext.Provider value={value}>
      {children}
    </PendingActionContext.Provider>
  );
}

export function usePendingAction() {
  const context = useContext(PendingActionContext);
  if (!context) {
    throw new Error(
      "usePendingAction must be used within a PendingActionProvider",
    );
  }
  return context;
}
