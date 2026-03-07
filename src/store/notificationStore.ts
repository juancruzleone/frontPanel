import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    date: Date | string;
    ordenId?: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'date'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const getUnreadCount = (notifications: Notification[]) => notifications.filter((notification) => !notification.read).length;

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,
            addNotification: (notification) => {
                const newNotification: Notification = {
                    ...notification,
                    id: Math.random().toString(36).substring(2, 9),
                    read: false,
                    date: new Date(),
                };
                set((state) => {
                    const notifications = [newNotification, ...state.notifications];
                    return {
                        notifications,
                        unreadCount: getUnreadCount(notifications),
                    };
                });
            },
            markAsRead: (id) => {
                set((state) => {
                    const notifications = state.notifications.map((n) =>
                        n.id === id ? { ...n, read: true } : n
                    );
                    return {
                        notifications,
                        unreadCount: getUnreadCount(notifications),
                    };
                });
            },
            markAllAsRead: () => {
                set((state) => {
                    const notifications = state.notifications.map((n) => ({ ...n, read: true }));
                    return {
                        notifications,
                        unreadCount: getUnreadCount(notifications),
                    };
                });
            },
            clearNotifications: () => {
                set({ notifications: [], unreadCount: 0 });
            },
        }),
        {
            name: 'notification-storage',
            partialize: (state) => ({
                notifications: state.notifications,
            }),
            merge: (persistedState, currentState) => {
                const persistedNotifications = (persistedState as { notifications?: Notification[] } | undefined)?.notifications ?? [];
                return {
                    ...currentState,
                    notifications: persistedNotifications,
                    unreadCount: getUnreadCount(persistedNotifications),
                };
            },
        }
    )
);
