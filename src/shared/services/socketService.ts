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
const ASSIGNED_ORDER_TOAST_DURATION_MS = 9000;

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
    private assignedOrdersPollId: number | null = null;
    private knownOrderIds = new Set<string>();
    private isSyncingAssignedOrders = false;
    private workOrdersListeners = new Set<() => void>();
    private workOrdersNotifyTimeoutId: number | null = null;

    connect() {
        if (this.socket) return;
        this.startAssignedOrdersPolling();

        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !SOCKET_URL) {
            return;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            autoConnect: true,
            withCredentials: true,
        });

        this.socket.on('connect', () => {
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

        this.socket.on('connect_error', (error: Error) => {
            // Error de conexión
        });

        this.socket.on('disconnect', () => {
            // Desconectado
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

        const response = await fetch(`${API_URL}ordenes-trabajo`, {
            headers: getAuthHeaders(),
        });

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
        } catch (error) {
            // Error al sincronizar órdenes asignadas
        } finally {
            this.isSyncingAssignedOrders = false;
        }
    }

    private startAssignedOrdersPolling() {
        const { role } = useAuthStore.getState();
        if (!isTechnician(role)) {
            return;
        }

        this.stopAssignedOrdersPolling();
        this.syncAssignedOrders(false);
        this.assignedOrdersPollId = window.setInterval(() => {
            this.syncAssignedOrders(true);
        }, ASSIGNED_ORDERS_POLL_MS);
    }

    private stopAssignedOrdersPolling() {
        if (this.assignedOrdersPollId !== null) {
            clearInterval(this.assignedOrdersPollId);
            this.assignedOrdersPollId = null;
        }
    }

    disconnect() {
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
