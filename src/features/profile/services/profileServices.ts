import { useAuthStore } from '../../../store/authStore';
import { getAuthHeaders } from '../../../shared/utils/apiHeaders';

const API_URL = import.meta.env.VITE_API_URL;

export const fetchAssignedWorkOrders = async () => {
  const token = useAuthStore.getState().token;
  const user = useAuthStore.getState().user;
  if (!token || !user) throw new Error('No autenticado');

  const response = await fetch(`${API_URL}ordenes-trabajo`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener órdenes');
  const data = await response.json();
  // Filtrar órdenes asignadas al usuario
  const assigned = (data.data || data).filter((order: any) => {
    if (!order.tecnicoAsignado) return false;
    // Puede ser por nombre o id según backend, aquí por nombre
    return order.tecnico && order.tecnico.userName === user;
  });
  return assigned;
}; 