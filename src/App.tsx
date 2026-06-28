import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/context/AuthContext";
import { PendingActionProvider } from "@/context/PendingActionContext";
import { ChatProvider } from "@/context/ChatContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ChatButton } from "@/components/chat/ChatButton";
import { ChatWindow } from "@/components/chat/ChatWindow";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

import Home from "@/pages/public/Home";
import MarketplacePreview from "@/pages/public/MarketplacePreview";
import SignIn from "@/pages/public/SignIn";
import TutorPreview from "@/pages/public/TutorPreview";

import Dashboard from "@/pages/protected/Dashboard";
import ItemDetail from "@/pages/protected/ItemDetail";
import TutorDetail from "@/pages/protected/TutorDetail";
import MyListings from "@/pages/protected/MyListings";
import MyFavourites from "@/pages/protected/MyFavourites";
import MyTutorProfile from "@/pages/protected/MyTutorProfile";
import Notifications from "@/pages/protected/Notifications";
import Chat from "@/pages/protected/Chat";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthAwareHome() {
  const { isAuthenticated, isInitialized } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isInitialized && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isInitialized, setLocation]);

  if (!isInitialized) {
    return (
      <PublicLayout fullWidth>
        <Home />
      </PublicLayout>
    );
  }

  if (isAuthenticated) return null;

  return (
    <PublicLayout fullWidth>
      <Home />
    </PublicLayout>
  );
}

function AuthAwareTutorDetail() {
  const { isAuthenticated, isInitialized } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isInitialized, setLocation]);

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  return (
    <PublicLayout>
      <TutorDetail />
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        <AuthAwareHome />
      </Route>
      <Route path="/marketplace">
        <PublicLayout>
          <MarketplacePreview />
        </PublicLayout>
      </Route>
      <Route path="/signin">
        <SignIn />
      </Route>
      <Route path="/tutors">
        <PublicLayout>
          <TutorPreview />
        </PublicLayout>
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedLayout>
          <Dashboard />
        </ProtectedLayout>
      </Route>
      <Route path="/item/:id">
        <PublicLayout>
          <ItemDetail />
        </PublicLayout>
      </Route>
      <Route path="/marketplace/item/:id">
        <PublicLayout>
          <ItemDetail />
        </PublicLayout>
      </Route>
      <Route path="/tutors/tutor/:id">
        <AuthAwareTutorDetail />
      </Route>
      <Route path="/my-listings">
        <ProtectedLayout>
          <MyListings />
        </ProtectedLayout>
      </Route>
      <Route path="/my-favourites">
        <ProtectedLayout>
          <MyFavourites />
        </ProtectedLayout>
      </Route>
      <Route path="/my-tutor-profile">
        <ProtectedLayout>
          <MyTutorProfile />
        </ProtectedLayout>
      </Route>
      <Route path="/tutor/requests">
        <ProtectedLayout>
          <MyTutorProfile />
        </ProtectedLayout>
      </Route>
      <Route path="/notifications">
        <ProtectedLayout>
          <Notifications />
        </ProtectedLayout>
      </Route>
      <Route path="/chat">
        <ProtectedLayout>
          <Chat />
        </ProtectedLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalChat() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return (
    <>
      <ChatButton />
      <ChatWindow />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-transparent">
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <PendingActionProvider>
                <ChatProvider>
                  <TooltipProvider>
                    <Router />
                    <GlobalChat />
                  </TooltipProvider>
                </ChatProvider>
              </PendingActionProvider>
            </WouterRouter>
            <Toaster />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
