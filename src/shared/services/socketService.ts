import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { getAuthHeaders } from '../utils/apiHeaders';
import { isTechnician } from '../utils/roleUtils';
import { toast } from 'sonner';
import i18n from '../../i18n';
import { pushNotificationService } from './pushNotificationService';

const API_URL = import.meta.env.VITE_API_URL || "/api/";
const ASSIGNED_ORDERS_POLL_MS = 15000;
const ASSIGNED_ORDERS_POLL_MAX_MS = 30000;
const ASSIGNED_ORDERS_PAGE_LIMIT = 50;
const ASSIGNED_ORDER_TOAST_DURATION_MS = 9000;

class AssignedOrdersSyncError extends Error {
    status: number;
    retryAfterMs?: number;

    constructor(status: number, message: string, retryAfterMs?: number) {
        super(message);
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

const parseRetryAfterMs = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const retryAt = Date.parse(value);
    if (Number.isNaN(retryAt)) return undefined;
    return Math.max(0, retryAt - Date.now());
};

const resolveSocketUrl = () => {
    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    if (configuredSocketUrl) {
        return configuredSocketUrl;
    }

    const normalizedApiUrl = API_URL.trim();
    if (/^https?:\/\//.test(normalizedApiUrl)) {
        return new URL(normalizedApiUrl).origin;
    }

    return '';
};

const SOCKET_URL = resolveSocketUrl();

class SocketService {
    private socket: Socket | null = null;
    private assignedOrdersPollTimeoutId: number | null = null;
    private assignedOrdersPollingActive = false;
    private intentionallyDisconnected = false;
    private knownOrderIds = new Set<string>();
    private isSyncingAssignedOrders = false;
    private pollRetryCount = 0;
    private workOrdersListeners = new Set<() => void>();
    private workOrdersNotifyTimeoutId: number | null = null;

    connect() {
        if (this.socket) return;

        const { isAuthenticated, isAuthResolved } = useAuthStore.getState();
        if (!isAuthResolved || !isAuthenticated || !SOCKET_URL) {
            return;
        }

        this.intentionallyDisconnected = false;
        this.startAssignedOrdersPolling();
        this.socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            autoConnect: true,
            withCredentials: true,
        });

        this.socket.on('connect', () => {
            this.stopAssignedOrdersPolling();
            this.identify();
        });

        this.socket.on('nueva_orden_asignada', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('nuevaOrdenAsignada', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('orden_asignada', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('orden-trabajo-asignada', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('notificacion_orden_asignada', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('work_order_assigned', (data: any) => this.handleAssignedOrderEvent(data));
        this.socket.on('orden_trabajo_creada', () => this.notifyWorkOrdersChanged());
        this.socket.on('orden-trabajo-creada', () => this.notifyWorkOrdersChanged());
        this.socket.on('work_order_created', () => this.notifyWorkOrdersChanged());
        this.socket.on('nueva_orden_trabajo', () => this.notifyWorkOrdersChanged());
        this.socket.on('orden_trabajo_actualizada', () => this.notifyWorkOrdersChanged());
        this.socket.on('orden-trabajo-actualizada', () => this.notifyWorkOrdersChanged());
        this.socket.on('work_order_updated', () => this.notifyWorkOrdersChanged());
        this.socket.on('orden_trabajo_eliminada', () => this.notifyWorkOrdersChanged());
        this.socket.on('orden-trabajo-eliminada', () => this.notifyWorkOrdersChanged());
        this.socket.on('work_order_deleted', () => this.notifyWorkOrdersChanged());

        this.socket.on('connect_error', () => {
            // Error de conexión
            if (this.intentionallyDisconnected) return;
            this.startAssignedOrdersPolling();
        });

        this.socket.on('disconnect', () => {
            if (this.intentionallyDisconnected) return;
            this.startAssignedOrdersPolling();
        });
    }

    identify() {
        const { userId, tenantId, role } = useAuthStore.getState();

        if (this.socket && userId) {
            this.socket.emit('identify', userId);
            this.socket.emit('identify', { userId, tenantId, role });
            this.socket.emit('register-user', { userId, tenantId, role });
            this.socket.emit('register', { userId, tenantId, role });
        }
    }

    private isOrderForCurrentTechnician(data: any) {
        const { userId, user, role } = useAuthStore.getState();
        if (!isTechnician(role)) {
            return false;
        }

        const assignedIds = [
            ...(Array.isArray(data?.tecnicosAsignados) ? data.tecnicosAsignados : []),
            ...(Array.isArray(data?.tecnicosIds) ? data.tecnicosIds : []),
            data?.tecnicoAsignado,
            data?.tecnicoId,
            data?.userId,
            data?.tecnico?._id,
        ].filter(Boolean).map((id) => String(id));
        const assignedUserName = data?.tecnico?.userName || data?.userName;

        if (!assignedIds.length && !assignedUserName) {
            return true;
        }

        if (userId && assignedIds.includes(String(userId))) {
            return true;
        }

        if (assignedUserName && user && String(assignedUserName) === String(user)) {
            return true;
        }

        return false;
    }

    private getOrderId(data: any) {
        return data?.ordenId || data?._id || data?.id || null;
    }

    private pushAssignedOrderNotification(data: any) {
        if (!this.isOrderForCurrentTechnician(data)) {
            return;
        }

        const orderId = this.getOrderId(data);
        if (orderId) {
            const normalizedOrderId = String(orderId);
            if (this.knownOrderIds.has(normalizedOrderId)) {
                return;
            }
            this.knownOrderIds.add(normalizedOrderId);
        }

        const title = i18n.t('notifications.newOrderTitle');
        const message = data?.mensaje || i18n.t('notifications.newOrderMessage', { title: data?.titulo || '-' });
        const { addNotification } = useNotificationStore.getState();

        addNotification({
            title,
            message,
            type: 'info',
            ordenId: orderId ? String(orderId) : undefined
        });

        toast.info(title, {
            description: message,
            duration: ASSIGNED_ORDER_TOAST_DURATION_MS,
        });

        pushNotificationService.showForegroundNotification(title, {
            body: message,
            icon: '/logo leonix 5.svg',
            data: {
                url: '/ordenes-trabajo',
                ordenId: orderId ? String(orderId) : undefined,
            },
            tag: orderId ? `orden-${String(orderId)}` : 'orden-asignada',
        });
    }

    private handleAssignedOrderEvent(data: any) {
        this.pushAssignedOrderNotification(data);
        this.notifyWorkOrdersChanged();
    }

    onWorkOrdersChanged(listener: () => void) {
        this.workOrdersListeners.add(listener);
        return () => {
            this.workOrdersListeners.delete(listener);
        };
    }

    private notifyWorkOrdersChanged() {
        if (this.workOrdersNotifyTimeoutId !== null) {
            clearTimeout(this.workOrdersNotifyTimeoutId);
        }
        this.workOrdersNotifyTimeoutId = window.setTimeout(() => {
            this.workOrdersListeners.forEach((listener) => listener());
            this.workOrdersNotifyTimeoutId = null;
        }, 250);
    }

    private async fetchAssignedOrders() {
        const { isAuthenticated, role, userId, user } = useAuthStore.getState();
        if (!isAuthenticated || !isTechnician(role)) {
            return [];
        }

        const url = `${API_URL}ordenes-trabajo?limit=${ASSIGNED_ORDERS_PAGE_LIMIT}&page=1`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });

        if (response.status === 429) {
            throw new AssignedOrdersSyncError(
                429,
                'Rate limited al sincronizar órdenes asignadas',
                parseRetryAfterMs(response.headers.get('Retry-After')),
            );
        }

        if (!response.ok) {
            throw new Error('No se pudieron sincronizar órdenes asignadas');
        }

        const result = await response.json();
        const orders = result?.data || result || [];

        return orders.filter((order: any) => {
            const assignedIds = [
                ...(Array.isArray(order?.tecnicosAsignados) ? order.tecnicosAsignados : []),
                ...(Array.isArray(order?.tecnicosIds) ? order.tecnicosIds : []),
                order?.tecnicoAsignado,
                order?.tecnico?._id,
            ].filter(Boolean).map((id: any) => String(id));
            const assignedUserName = order?.tecnico?.userName;

            if (userId && assignedIds.includes(String(userId))) {
                return true;
            }

            if (assignedUserName && user && String(assignedUserName) === String(user)) {
                return true;
            }

            return false;
        });
    }

    private async syncAssignedOrders(notifyNew: boolean) {
        if (this.isSyncingAssignedOrders) {
            return;
        }

        this.isSyncingAssignedOrders = true;
        let nextDelayMs = ASSIGNED_ORDERS_POLL_MS;
        try {
            const assignedOrders = await this.fetchAssignedOrders();
            assignedOrders.forEach((order: any) => {
                const orderId = this.getOrderId(order);
                if (!orderId) {
                    return;
                }

                const normalizedOrderId = String(orderId);
                const alreadyKnown = this.knownOrderIds.has(normalizedOrderId);

                if (!alreadyKnown) {
                    if (notifyNew) {
                        this.pushAssignedOrderNotification(order);
                    } else {
                        this.knownOrderIds.add(normalizedOrderId);
                    }
                }
            });
            // éxito: reset backoff
            this.pollRetryCount = 0;
        } catch (error: unknown) {
            if (error instanceof AssignedOrdersSyncError && error.status === 429) {
                this.pollRetryCount += 1;
                const backoffMs = Math.min(ASSIGNED_ORDERS_POLL_MS * Math.pow(2, this.pollRetryCount - 1), ASSIGNED_ORDERS_POLL_MAX_MS);
                nextDelayMs = Math.max(backoffMs, error.retryAfterMs ?? 0);
            } else {
                this.pollRetryCount = 0;
            }
            // Error al sincronizar órdenes asignadas
        } finally {
            this.isSyncingAssignedOrders = false;
        }
        this.scheduleNextPoll(nextDelayMs);
    }

    private scheduleNextPoll(delayMs: number) {
        if (this.assignedOrdersPollTimeoutId !== null) {
            clearTimeout(this.assignedOrdersPollTimeoutId);
            this.assignedOrdersPollTimeoutId = null;
        }
        if (!this.assignedOrdersPollingActive || this.socket?.connected) return;
        this.assignedOrdersPollTimeoutId = window.setTimeout(() => {
            this.assignedOrdersPollTimeoutId = null;
            void this.syncAssignedOrders(true);
        }, delayMs);
    }

    private startAssignedOrdersPolling() {
        const { role } = useAuthStore.getState();
        if (!isTechnician(role)) {
            return;
        }

        if (this.socket?.connected || this.assignedOrdersPollingActive) return;
        this.assignedOrdersPollingActive = true;
        this.pollRetryCount = 0;
        void this.syncAssignedOrders(false);
    }

    private stopAssignedOrdersPolling() {
        this.assignedOrdersPollingActive = false;
        if (this.assignedOrdersPollTimeoutId !== null) {
            clearTimeout(this.assignedOrdersPollTimeoutId);
            this.assignedOrdersPollTimeoutId = null;
        }
        this.pollRetryCount = 0;
    }

    disconnect() {
        this.intentionallyDisconnected = true;
        this.stopAssignedOrdersPolling();
        this.knownOrderIds.clear();
        if (this.workOrdersNotifyTimeoutId !== null) {
            clearTimeout(this.workOrdersNotifyTimeoutId);
            this.workOrdersNotifyTimeoutId = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
