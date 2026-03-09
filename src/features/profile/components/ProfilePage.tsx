import React, { useMemo, useState, useEffect } from "react";
import styles from "../styles/profile.module.css";
import { useProfile } from "../hooks/useProfile";
import SearchInput from "../../../shared/components/Inputs/SearchInput";
import { useTranslation } from "react-i18next";
import { translateUserRole } from "../../../shared/utils/backendTranslations";
import Skeleton from "../../../shared/components/Skeleton";
import { User } from "lucide-react";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, role, orders, installations, installationTypes, loading, error, userData } = useProfile();
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatedOrders, setUpdatedOrders] = useState<any[]>([]);

  useEffect(() => {
    // Cuando las órdenes cambian, verifica si necesitan detalles de instalación
    const enrichOrders = async () => {
      if (!orders || orders.length === 0) {
        setUpdatedOrders([]);
        return;
      }

      const enriched = await Promise.all(orders.map(async (order) => {
        const instId = order.instalacionId || (typeof order.instalacion === 'string' ? order.instalacion : (order.instalacion?._id || null));

        if (instId && (!order.instalacion || typeof order.instalacion === 'string' || !order.instalacion.company)) {
          try {
            const { fetchInstallationById } = await import('../../installations/services/installationServices');
            const installationData = await fetchInstallationById(instId);
            return { ...order, instalacion: installationData };
          } catch (err) {
            return order;
          }
        }
        return order;
      }));
      setUpdatedOrders(enriched);
    };

    enrichOrders();
  }, [orders]);

  const isClient = role === 'cliente';

  // Opciones de filtro según el rol
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
      return updatedOrders.filter((order) => {
        const matchesStatus = !selectedFilter || order.estado === selectedFilter;
        const matchesSearch = [
          order.titulo,
          order.instalacion?.company,
          order.instalacionId,
        ].some((f) => f?.toLowerCase().includes(term));
        return matchesStatus && matchesSearch;
      });
    }
  }, [updatedOrders, installations, selectedFilter, searchTerm, isClient]);

  return (
    <div className={styles.profileContainer}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <Skeleton height={80} width="100%" style={{ borderRadius: 12 }} />
          <Skeleton height={60} width="100%" style={{ borderRadius: 12 }} />
          <div className={styles.skeletonGrid}>
            {[1, 2, 3].map((_, i) => (
              <Skeleton key={i} height={140} width="100%" style={{ borderRadius: 12 }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.profileHeader}>
            {(role === 'técnico' || role === 'tecnico') && userData?.profilePhoto && (
              <div className={styles.profilePhotoContainer}>
                <img 
                  src={userData.profilePhoto} 
                  alt={`${user} profile`}
                  className={styles.profilePhoto}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove(styles.hidden);
                  }}
                />
                <div className={`${styles.profilePhotoPlaceholder} ${styles.hidden}`}>
                  <User size={48} />
                </div>
              </div>
            )}
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
            {error && <div style={{ color: 'red' }}>{t('profile.errorOrders', { defaultValue: 'Error:' }) + ' ' + error}</div>}
            {!error && filteredData.length === 0 && <div>
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
                    <span className={styles.orderStatus}>{inst.installationType}</span>
                    <div className={styles.orderMeta}>{inst.address}, {inst.city}</div>
                  </div>
                ))
              ) : (
                // Renderizar órdenes para técnicos/admins
                filteredData.map((order) => {
                  const getStatusColor = (status: string) => {
                    const s = (status || "").toLowerCase();
                    switch (s) {
                      case "pendiente": return "#9E9E9E";
                      case "asignada": return "#2196F3";
                      case "en_progreso": return "#FF9800";
                      case "completada": return "#4CAF50";
                      case "cancelada": return "#F44336";
                      default: return "var(--color-primary)";
                    }
                  };

                  const installation = order.instalacion;
                  const hasInstallationData = installation && typeof installation === 'object' && installation.company;

                  return (
                    <div key={order._id} className={styles.orderCard}>
                      <div className={styles.orderTitle}>{order.titulo}</div>
                      <span
                        className={styles.orderStatus}
                        style={{ backgroundColor: getStatusColor(order.estado) }}
                      >
                        {t(`workOrders.${order.estado}`, { defaultValue: order.estado })}
                      </span>
                      <div className={styles.orderMeta}>
                        <div className={styles.installationInfo}>
                          <strong>{t('workOrders.installation', { defaultValue: 'Instalación' })}:</strong>
                          {hasInstallationData ? (
                            <>
                              <span className={styles.installationName}>{installation.company}</span>
                              <span className={styles.installationAddress}>
                                {installation.address}{installation.city ? `, ${installation.city}` : ''}
                              </span>
                            </>
                          ) : (
                            <span>{order.instalacionId || (typeof order.instalacion === 'string' ? order.instalacion : 'N/A')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;