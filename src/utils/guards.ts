import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth(redirectUrl: string = "/") {
  const { isAuthenticated, isInitialized } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      setLocation(redirectUrl);
    }
  }, [isAuthenticated, isInitialized, setLocation, redirectUrl]);

  return isAuthenticated;
}

export function useRequireGuest(redirectUrl: string = "/dashboard") {
  const { isAuthenticated, isInitialized } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      setLocation(redirectUrl);
    }
  }, [isAuthenticated, isInitialized, setLocation, redirectUrl]);

  return !isAuthenticated;
}
