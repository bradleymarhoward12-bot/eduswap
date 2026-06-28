import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/context/NotificationContext";
import { useChat } from "@/context/ChatContext";
import { Bell, Check, MessageSquare, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getNotificationHref } from "@/utils/notificationRoutes";

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { openTutorRequestChat } = useChat();
  const [, setLocation] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="btn-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-100 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto px-2 py-1 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`w-full flex gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${!notif.isRead ? "bg-muted/20" : ""}`}
                onSelect={async () => {
                  await markAsRead(notif.id);
                  if (notif.type === "chat") {
                    await openTutorRequestChat(notif.relatedId);
                    return;
                  }

                  setLocation(getNotificationHref(notif));
                }}
                data-testid={`notification-item-${notif.id}`}
              >
                <div className="mt-0.5">
                  {notif.type === "interest" && (
                    <Heart className="h-4 w-4 text-primary" />
                  )}
                  {notif.type === "message" && (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                  {notif.type === "chat" && (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {notif.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notif.body}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
