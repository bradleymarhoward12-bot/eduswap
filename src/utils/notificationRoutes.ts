import type { Notification } from "@/types";

export function getNotificationHref(notification: Notification): string {
  if (notification.type === "interest") {
    return `/item/${notification.relatedId}`;
  }

  if (notification.type === "chat") {
    return `/chat?requestId=${notification.relatedId}`;
  }

  return "/notifications";
}
