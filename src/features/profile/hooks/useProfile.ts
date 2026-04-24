import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { fetchAssignedWorkOrders } from '../services/profileServices';
import { fetchInstallations } from '../../installations/services/installationServices';
import { fetchInstallationTypes } from '../../installations/services/installationTypeServices';

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [installationTypes, setInstallationTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cargar datos completos del usuario
        if (userId) {
          const { getUserById } = await import('../../auth/register/services/registerServices');
          const { token } = useAuthStore.getState();
          const userDataResponse = await getUserById(userId, token);

          setUserData(userDataResponse);
        }

        if (role === 'cliente') {
          // Para clientes, cargar instalaciones asignadas
          const response = await fetchInstallations();
          setInstallations(response.data || []);
          // Cargar tipos de instalación para el filtro
          const types = await fetchInstallationTypes();
          setInstallationTypes(types);
        } else {
          // Para técnicos/admins, cargar órdenes de trabajo
          const workOrders = await fetchAssignedWorkOrders();
          setOrders(workOrders);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, role, userId]);

  return { user, role, orders, installations, installationTypes, loading, error, userData };
} 
