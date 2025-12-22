import React, { useMemo, useState } from "react";
import styles from "../styles/profile.module.css";
import { useProfile } from "../hooks/useProfile";
import SearchInput from "../../../shared/components/Inputs/SearchInput";
import { useTranslation } from "react-i18next";
import { translateUserRole } from "../../../shared/utils/backendTranslations";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, role, orders, installations, installationTypes, loading, error } = useProfile();
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
      return orders.filter((order) => {
        const matchesStatus = !selectedFilter || order.estado === selectedFilter;
        const matchesSearch = [
          order.titulo,
          order.instalacion?.company,
          order.instalacionId,
        ].some((f) => f?.toLowerCase().includes(term));
        return matchesStatus && matchesSearch;
      });
    }
  }, [orders, installations, selectedFilter, searchTerm, isClient]);

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.profileAvatar}>
          {user ? user[0] : "?"}
        </div>
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
        {loading && <div>
          {isClient
            ? t('profile.loadingInstallations', { defaultValue: 'Cargando instalaciones...' })
            : t('profile.loadingOrders', { defaultValue: 'Cargando órdenes...' })
          }
        </div>}
        {error && <div style={{ color: 'red' }}>{t('profile.errorOrders', { defaultValue: 'Error:' }) + ' ' + error}</div>}
        {!loading && !error && filteredData.length === 0 && <div>
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
            filteredData.map((order) => (
              <div key={order._id} className={styles.orderCard}>
                <div className={styles.orderTitle}>{order.titulo}</div>
                <span className={styles.orderStatus}>{t(`workOrders.${order.estado}`, { defaultValue: order.estado })}</span>
                <div className={styles.orderMeta}>{t('workOrders.installation', { defaultValue: 'Instalación' })}: {order.instalacion?.company || order.instalacionId}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;