import { useNotifications } from "@/context/NotificationContext";
import { useChat } from "@/context/ChatContext";
import {
  Bell,
  Heart,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { getNotificationHref } from "@/utils/notificationRoutes";

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } =
    useNotifications();
  const { openTutorRequestChat } = useChat();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Stay updated with your campus activities.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="shrink-0"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 border rounded-xl border-dashed bg-card/50">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">You're all caught up!</p>
          <p className="text-muted-foreground">No new notifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              className={`w-full text-left p-4 rounded-xl border flex gap-4 transition-colors ${!notif.isRead ? "bg-primary/5 border-primary/20" : "bg-card"}`}
              onClick={async () => {
                await markAsRead(notif.id);
                if (notif.type === "chat") {
                  await openTutorRequestChat(notif.relatedId);
                  return;
                }

                setLocation(getNotificationHref(notif));
              }}
            >
              <div className="mt-1 shrink-0">
                {notif.type === "interest" && (
                  <Heart
                    className={`h-6 w-6 ${!notif.isRead ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
                {notif.type === "message" && (
                  <MessageSquare
                    className={`h-6 w-6 ${!notif.isRead ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
                {notif.type === "chat" && (
                  <MessageSquare
                    className={`h-6 w-6 ${!notif.isRead ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3
                    className={`font-medium ${!notif.isRead ? "text-foreground" : "text-foreground/80"}`}
                  >
                    {notif.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{notif.body}</p>
              </div>
              {!notif.isRead && (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
