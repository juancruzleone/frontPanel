import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { FiArrowLeft } from "react-icons/fi";
import { useUserProfile } from "../features/profile/hooks/useUserProfile";
import SearchInput from "../shared/components/Inputs/SearchInput";
import styles from "../features/profile/styles/profile.module.css";
import { translateUserRole, translateWorkOrderStatus } from "../shared/utils/backendTranslations";
import Skeleton from "../shared/components/Skeleton";

const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { role: currentUserRole } = useAuthStore();
  const { user, role, orders, installations, installationTypes, loading, error } = useUserProfile(userId || "");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ordersWithInstallations, setOrdersWithInstallations] = useState<any[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);

  // Verificar que solo los admins puedan acceder
  if (currentUserRole !== "admin") {
    navigate("/inicio");
    return null;
  }

  const isClient = role === 'cliente';

  // Cargar detalles de instalación para cada orden
  useEffect(() => {
    const loadInstallationsForOrders = async () => {
      if (orders.length === 0 || isClient) {
        setOrdersWithInstallations(orders);
        setLoadingInstallations(false);
        return;
      }

      setLoadingInstallations(true);
      try {
        const { fetchInstallationById } = await import('../features/installations/services/installationServices');
        
        const ordersWithDetails = await Promise.all(
          orders.map(async (order) => {
            if (order.instalacion) {
              return { ...order, instalacion: order.instalacion };
            } else if (order.instalacionId) {
              try {
                const installationData = await fetchInstallationById(order.instalacionId);
                return { ...order, instalacion: installationData };
              } catch (err) {
                return order;
              }
            }
            return order;
          })
        );

        setOrdersWithInstallations(ordersWithDetails);
      } catch (error) {
        setOrdersWithInstallations(orders);
      } finally {
        setLoadingInstallations(false);
      }
    };

    loadInstallationsForOrders();
  }, [orders, isClient]);

  // Función para obtener el color según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "#9E9E9E";
      case "asignada":
        return "#2196F3";
      case "en_progreso":
        return "#FF9800";
      case "completada":
        return "#4CAF50";
      case "cancelada":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  // Función para obtener el color según el tipo de instalación
  const getInstallationTypeColor = (type: string) => {
    // Generar un color basado en el tipo de instalación
    const colors = [
      "#2196F3", // Azul
      "#4CAF50", // Verde
      "#FF9800", // Naranja
      "#9C27B0", // Púrpura
      "#00BCD4", // Cian
      "#FF5722", // Rojo-Naranja
      "#795548", // Marrón
      "#607D8B", // Gris-Azul
    ];
    
    // Usar el hash del tipo para seleccionar un color consistente
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Opciones de filtro según el rol del usuario visualizado
  const filterOptions = useMemo(() => {
    if (isClient) {
      // Para clientes: filtrar por tipo de instalación
      return [
        { label: t('common.all'), value: "" },
        ...installationTypes.map((type) => ({
          label: type.nombre,
          value: type.nombre,
        })),
      ];
    } else {
      // Para técnicos/admins: filtrar por estado de orden
      return [
        { label: t('common.all'), value: "" },
        { label: t('workOrders.pending'), value: "pendiente" },
        { label: t('workOrders.assigned'), value: "asignada" },
        { label: t('workOrders.inProgress'), value: "en_progreso" },
        { label: t('workOrders.completed'), value: "completada" },
        { label: t('workOrders.cancelled'), value: "cancelada" },
      ];
    }
  }, [t, isClient, installationTypes]);

  // Datos filtrados según el rol
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    if (isClient) {
      // Filtrar instalaciones para clientes
      return installations.filter((inst) => {
        const matchesFilter = !selectedFilter || inst.installationType === selectedFilter;
        const matchesSearch = [
          inst.company,
          inst.address,
          inst.city,
          inst.installationType,
        ].some((f) => f?.toLowerCase().includes(term));
        return matchesFilter && matchesSearch;
      });
    } else {
      // Filtrar órdenes para técnicos/admins
      return ordersWithInstallations.filter((order) => {
        const matchesStatus = !selectedFilter || order.estado === selectedFilter;
        const matchesSearch = [
          order.titulo,
          order.instalacion?.company,
          order.instalacionId,
        ].some((f) => f?.toLowerCase().includes(term));
        return matchesStatus && matchesSearch;
      });
    }
  }, [ordersWithInstallations, installations, selectedFilter, searchTerm, isClient]);

  const handleGoBack = () => {
    navigate("/personal");
  };

  if (loading || loadingInstallations) {
    return (
      <div className={styles.profileContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={handleGoBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              width: '36px',
              height: '36px'
            }}
            title={t('common.back')}
          >
            <FiArrowLeft size={20} />
          </button>
        </div>
        <div className={styles.loadingContainer}>
          <Skeleton height={80} width="100%" style={{ borderRadius: 12 }} />
          <Skeleton height={60} width="100%" style={{ borderRadius: 12 }} />
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((_, i) => (
              <Skeleton key={i} height={140} width="100%" style={{ borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
          <div>{error}</div>
          <button onClick={handleGoBack} style={{ marginTop: '16px', padding: '8px 16px' }}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <button
          onClick={handleGoBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            width: '36px',
            height: '36px'
          }}
          title={t('common.back')}
        >
          <FiArrowLeft size={20} />
        </button>
      </div>

      <div className={styles.profileHeader}>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>{user}</span>
          <span className={styles.profileRole}>{role ? translateUserRole(role) : role}</span>
        </div>
      </div>
      <div className={styles.profileDetails}>
        <div className={styles.ordersTitle}>
          {isClient
            ? t('profile.assignedInstallations', { defaultValue: 'Instalaciones asignadas' })
            : t('profile.assignedOrders', { defaultValue: 'Órdenes asignadas' })
          }
        </div>
        <div style={{ width: '100%', marginBottom: 24 }}>
          <SearchInput
            placeholder={isClient
              ? t('profile.searchInstallationPlaceholder', { defaultValue: 'Buscar instalación...' })
              : t('workOrders.searchPlaceholder', { defaultValue: 'Buscar orden...' })
            }
            showSelect
            selectPlaceholder={isClient
              ? t('installations.filterByInstallationType', { defaultValue: 'Filtrar por tipo' })
              : t('workOrders.filterByStatus', { defaultValue: 'Filtrar por estado' })
            }
            selectOptions={filterOptions}
            onInputChange={setSearchTerm}
            onSelectChange={setSelectedFilter}
          />
        </div>
        {!loading && !loadingInstallations && !error && filteredData.length === 0 && <div>
          {isClient
            ? t('profile.noAssignedInstallations', { defaultValue: 'No tienes instalaciones asignadas.' })
            : t('profile.noAssignedOrders', { defaultValue: 'No tienes órdenes asignadas.' })
          }
        </div>}
        <div className={styles.ordersList}>
          {isClient ? (
            // Renderizar instalaciones para clientes
            filteredData.map((inst) => (
              <div key={inst._id} className={styles.orderCard}>
                <div className={styles.orderTitle}>{inst.company}</div>
                <span 
                  className={styles.orderStatus}
                  style={{ 
                    backgroundColor: getInstallationTypeColor(inst.installationType),
                    color: '#000',
                    fontWeight: 700
                  }}
                >
                  {inst.installationType}
                </span>
                <div className={styles.orderMeta}>{inst.address}, {inst.city}</div>
              </div>
            ))
          ) : (
            // Renderizar órdenes para técnicos/admins
            filteredData.map((order) => (
              <div key={order._id} className={styles.orderCard}>
                <div className={styles.orderTitle}>{order.titulo}</div>
                <span 
                  className={styles.orderStatus}
                  style={{ 
                    backgroundColor: getStatusColor(order.estado),
                    color: '#000',
                    fontWeight: 700
                  }}
                >
                  {translateWorkOrderStatus(order.estado)}
                </span>
                {order.instalacion && (
                  <div className={styles.installationInfo}>
                    <div className={styles.installationName}>
                      {order.instalacion.company}
                    </div>
                    <div className={styles.installationAddress}>
                      {order.instalacion.address}, {order.instalacion.city}
                    </div>
                  </div>
                )}
                {!order.instalacion && order.instalacionId && (
                  <div className={styles.orderMeta}>
                    {t('workOrders.installation', { defaultValue: 'Instalación' })}: {order.instalacionId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;