import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUserProfile,
  logout as authLogout,
  onAuthStateChanged,
} from "@/services/auth";
import { auth as firebaseAuth } from "@/services/firebase";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void | Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setToken(null);
          setIsInitialized(true);
          return;
        }

        try {
          const profile = await getCurrentUserProfile(firebaseUser);
          setUser(profile);
          setToken(await firebaseUser.getIdToken());
        } catch (error) {
          console.error("Failed to load authenticated user profile", error);
          setUser(null);
          setToken(null);
        } finally {
          setIsInitialized(true);
        }
      },
    );

    return unsubscribe;
  }, []);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitialized,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
