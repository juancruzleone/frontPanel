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
      console.log('🔄 useUserProfile - Iniciando carga de datos');
      console.log('🔄 useUserProfile - userId:', userId);
      console.log('🔄 useUserProfile - token:', token ? 'Presente' : 'Ausente');
      
      try {
        setLoading(true);
        setError(null);

        // Obtener datos del usuario
        console.log('📞 useUserProfile - Llamando a getUserById...');
        const userResponse = await getUserById(userId, token);
        console.log('✅ useUserProfile - Usuario obtenido:', userResponse);
        setUserData(userResponse);

        // Verificar si el usuario es cliente
        if (userResponse.role === 'cliente') {
          console.log('👤 useUserProfile - Usuario es cliente, cargando instalaciones...');
          // Para clientes, cargar solo las instalaciones asignadas a ese cliente específico
          const installationsResponse = await fetch(`${API_URL}clientes-usuarios/${userId}/instalaciones`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!installationsResponse.ok) {
            throw new Error('Error al obtener instalaciones del cliente');
          }

          const installationsData = await installationsResponse.json();
          setInstallations(Array.isArray(installationsData) ? installationsData : (installationsData.data || []));
          
          // Cargar tipos de instalación para el filtro
          const types = await fetchInstallationTypes();
          setInstallationTypes(types);
        } else {
          console.log('👷 useUserProfile - Usuario es técnico/admin, cargando órdenes...');
          // Para técnicos/admins, obtener órdenes de trabajo asignadas
          const ordersResponse = await fetch(`${API_URL}ordenes-trabajo?populate=instalacion`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!ordersResponse.ok) {
            console.error('❌ useUserProfile - Error al obtener órdenes:', ordersResponse.status);
            throw new Error('Error al obtener órdenes de trabajo');
          }

          const ordersData = await ordersResponse.json();
          const data = ordersData.data || ordersData;

          // Filtrar órdenes asignadas al usuario específico
          const assigned = data.filter((order: any) => {
            if (!order.tecnicoAsignado) return false;
            return order.tecnico && order.tecnico.userName === userResponse.userName;
          });

          console.log('✅ useUserProfile - Órdenes filtradas:', assigned.length);
          setOrders(assigned);
        }
      } catch (err: any) {
        console.error('❌ useUserProfile - Error:', err);
        setError(err.message || 'Error al cargar datos del usuario');
      } finally {
        setLoading(false);
        console.log('✅ useUserProfile - Carga completada');
      }
    };

    if (userId && token) {
      fetchUserData();
    } else {
      console.warn('⚠️ useUserProfile - Falta userId o token');
      setLoading(false);
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