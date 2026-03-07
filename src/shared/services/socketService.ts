import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:2023';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('🔌 [Socket] Conectado al servidor');
            this.identify();
        });

        this.socket.on('nueva_orden_asignada', (data: any) => {
            console.log('📢 [Socket] Nueva orden recibida:', data);

            const { addNotification } = useNotificationStore.getState();
            addNotification({
                title: 'Nueva Orden Asignada',
                message: data.mensaje || `Se te ha asignado la orden: ${data.titulo}`,
                type: 'info',
                ordenId: data.ordenId
            });
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 [Socket] Desconectado');
        });
    }

    identify() {
        const user = useAuthStore.getState().user;
        // En el backend de backLeonix, el identify usa el userId. 
        // Como el authStore parece guardar 'user' (nombre), deberíamos ver si tenemos el ID.
        // Revisando el backend, vi que busca por .toString() del ID.
        // Asumiremos que el user en el store tiene acceso a su ID o el backend lo maneja.
        // Si no, necesitaremos asegurarnos que el ID esté en el authStore.
        const userId = useAuthStore.getState().userId;

        if (this.socket && userId) {
            console.log(`👤 [Socket] Identificando usuario: ${userId}`);
            this.socket.emit('identify', userId);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
