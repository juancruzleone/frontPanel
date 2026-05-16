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
    setNotificationOwner: (ownerId: string | null) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    ownerId: string | null;
}

const getUnreadCount = (notifications: Notification[]) => notifications.filter((notification) => !notification.read).length;

const dedupeNotifications = (notifications: Notification[]) => {
    const seenOrderIds = new Set<string>();
    const seenMessages = new Set<string>();

    return notifications.filter((notification) => {
        if (notification.ordenId) {
            const orderKey = String(notification.ordenId);
            if (seenOrderIds.has(orderKey)) {
                return false;
            }
            seenOrderIds.add(orderKey);
            return true;
        }

        const messageKey = `${notification.title}::${notification.message}`;
        if (seenMessages.has(messageKey)) {
            return false;
        }
        seenMessages.add(messageKey);
        return true;
    });
};

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            unreadCount: 0,
            ownerId: null,
            addNotification: (notification) => {
                const newNotification: Notification = {
                    ...notification,
                    id: Math.random().toString(36).substring(2, 9),
                    read: false,
                    date: new Date(),
                };
                set((state) => {
                    const alreadyExists = state.notifications.some((existingNotification) => {
                        if (notification.ordenId && existingNotification.ordenId) {
                            return String(existingNotification.ordenId) === String(notification.ordenId);
                        }

                        return (
                            existingNotification.title === notification.title &&
                            existingNotification.message === notification.message
                        );
                    });

                    if (alreadyExists) {
                        return state;
                    }

                    const notifications = [newNotification, ...state.notifications];
                    return {
                        notifications,
                        unreadCount: getUnreadCount(notifications),
                    };
                });
            },
            setNotificationOwner: (ownerId) => {
                set((state) => {
                    if (state.ownerId === ownerId) {
                        return state;
                    }

                    return {
                        ownerId,
                        notifications: [],
                        unreadCount: 0,
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
                ownerId: state.ownerId,
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as { notifications?: Notification[]; ownerId?: string | null } | undefined;
                const persistedNotifications = dedupeNotifications(persisted?.notifications ?? []);
                return {
                    ...currentState,
                    notifications: persistedNotifications,
                    unreadCount: getUnreadCount(persistedNotifications),
                    ownerId: persisted?.ownerId ?? null,
                };
            },
        }
    )
);
