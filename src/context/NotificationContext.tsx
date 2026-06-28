import React, { createContext, useContext, useEffect, useState } from "react";
import type { Notification } from "@/types";
import {
  createNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/services/notifications";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void | Promise<void>;
  markAllAsRead: () => void | Promise<void>;
  addNotification: (
    notification: Omit<Notification, "id" | "isRead" | "createdAt">,
  ) => void | Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return undefined;
    }

    return subscribeToNotifications(user.id, setNotifications);
  }, [user]);

  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
  };

  const addNotification = async (
    notification: Omit<Notification, "id" | "isRead" | "createdAt">,
  ) => {
    await createNotification(notification);
  };

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
