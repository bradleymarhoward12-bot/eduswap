import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, GraduationCap, Bell, ArrowRight } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { useChat } from "@/context/ChatContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { subscribeToListings } from "@/services/listings";
import { subscribeToTutorByUserId } from "@/services/tutors";
import { getFirstNameFromFullName, getUserFullName } from "@/services/firebase";
import type { ListingItem, TutorProfile } from "@/types";
import { useLocation } from "wouter";
import { getNotificationHref } from "@/utils/notificationRoutes";

export default function Dashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { openTutorRequestChat } = useChat();
  const [, setLocation] = useLocation();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);

  const firstName = getFirstNameFromFullName(getUserFullName(user));
  const totalInterested = listings.reduce(
    (sum, listing) => sum + (listing.interestedCount ?? 0),
    0,
  );
  const totalSaves = listings.reduce(
    (sum, listing) =>
      sum + (listing.savesCount ?? listing.interestedCount ?? 0),
    0,
  );

  useEffect(() => {
    if (!user) {
      setListings([]);
      return undefined;
    }

    return subscribeToListings(setListings, { sellerId: user.id });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTutorProfile(null);
      return undefined;
    }

    return subscribeToTutorByUserId(user.id, setTutorProfile);
  }, [user]);

  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="surface-card p-4 sm:p-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}!
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Here's what's happening on campus today.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Listings</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active items on marketplace
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {totalSaves} saves, {totalInterested} interested signals
            </p>
            <Link
              href="/my-listings"
              className="mt-4 inline-flex h-auto items-center px-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Manage listings <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tutor Profile</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tutorProfile?.isAvailable ? "Active" : "Hidden"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your profile is visible to students
            </p>
            <Link
              href="/my-tutor-profile"
              className="mt-4 inline-flex h-auto items-center px-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Edit profile <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                notifications.filter((notification) => !notification.isRead)
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unread notifications
            </p>
            <Link
              href="/notifications"
              className="mt-4 inline-flex h-auto items-center px-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest interactions on EduSwap
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 4).map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className="w-full flex items-start gap-4 text-left rounded-lg hover:bg-muted/40 p-2 -m-2 transition-colors"
                    onClick={async () => {
                      if (notification.type === "chat") {
                        await openTutorRequestChat(notification.relatedId);
                        return;
                      }

                      void setLocation(getNotificationHref(notification));
                    }}
                  >
                    <div className="mt-0.5 rounded-full p-2 bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Campus Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>Meet Safely:</strong> Always meet for exchanges in public,
              well-lit areas on campus during daylight hours (e.g., student
              union, library).
            </p>
            <p>
              <strong>Verify Items:</strong> Check the condition of items
              thoroughly before completing any transaction.
            </p>
            <p>
              <strong>Be Respectful:</strong> Maintain academic integrity during
              tutoring sessions and communicate professionally.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
