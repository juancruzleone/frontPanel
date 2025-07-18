import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { fetchAssignedWorkOrders } from '../services/profileServices';

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAssignedWorkOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return { user, role, orders, loading, error };
} 