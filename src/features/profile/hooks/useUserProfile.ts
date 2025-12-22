import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { getUserById } from '../../auth/register/services/registerServices';
import { fetchInstallations } from '../../installations/services/installationServices';
import { fetchInstallationTypes } from '../../installations/services/installationTypeServices';

const API_URL = import.meta.env.VITE_API_URL;

export function useUserProfile(userId: string) {
  const { token } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [installationTypes, setInstallationTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos del usuario
        const userResponse = await getUserById(userId, token);
        setUserData(userResponse);

        // Verificar si el usuario es cliente
        if (userResponse.role === 'cliente') {
          // Para clientes, cargar instalaciones asignadas
          const allInstallations = await fetchInstallations();
          setInstallations(allInstallations);
          // Cargar tipos de instalación para el filtro
          const types = await fetchInstallationTypes();
          setInstallationTypes(types);
        } else {
          // Para técnicos/admins, obtener órdenes de trabajo asignadas
          const ordersResponse = await fetch(`${API_URL}ordenes-trabajo?populate=instalacion`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!ordersResponse.ok) {
            throw new Error('Error al obtener órdenes de trabajo');
          }

          const ordersData = await ordersResponse.json();
          const data = ordersData.data || ordersData;

          // Filtrar órdenes asignadas al usuario específico
          const assigned = data.filter((order: any) => {
            if (!order.tecnicoAsignado) return false;
            return order.tecnico && order.tecnico.userName === userResponse.userName;
          });

          setOrders(assigned);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos del usuario');
      } finally {
        setLoading(false);
      }
    };

    if (userId && token) {
      fetchUserData();
    }
  }, [userId, token]);

  return {
    user: userData?.userName || null,
    role: userData?.role || null,
    orders,
    installations,
    installationTypes,
    loading,
    error,
    userData
  };
} 