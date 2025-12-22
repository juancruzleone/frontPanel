import React, { useMemo, useState } from "react";
import styles from "../styles/profile.module.css";
import { useProfile } from "../hooks/useProfile";
import SearchInput from "../../../shared/components/Inputs/SearchInput";
import { useTranslation } from "react-i18next";
import { translateUserRole } from "../../../shared/utils/backendTranslations";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, role, orders, loading, error } = useProfile();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const statusOptions = useMemo(() => [
    { label: t('common.all'), value: "" },
    { label: t('workOrders.pending'), value: "pendiente" },
    { label: t('workOrders.assigned'), value: "asignada" },
    { label: t('workOrders.inProgress'), value: "en_progreso" },
    { label: t('workOrders.completed'), value: "completada" },
    { label: t('workOrders.cancelled'), value: "cancelada" },
  ], [t]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = !selectedStatus || order.estado === selectedStatus;
      const matchesSearch = [
        order.titulo,
        order.instalacion?.company,
        order.instalacionId,
      ].some((f) => f?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedStatus, searchTerm]);

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
        <div className={styles.ordersTitle}>{t('profile.assignedOrders', { defaultValue: 'Órdenes asignadas' })}</div>
        <div style={{ width: '100%', marginBottom: 24 }}>
          <SearchInput
            placeholder={t('workOrders.searchPlaceholder', { defaultValue: 'Buscar orden...' })}
            showSelect
            selectPlaceholder={t('workOrders.filterByStatus', { defaultValue: 'Filtrar por estado' })}
            selectOptions={statusOptions}
            onInputChange={setSearchTerm}
            onSelectChange={setSelectedStatus}
          />
        </div>
        {loading && <div>{t('profile.loadingOrders', { defaultValue: 'Cargando órdenes...' })}</div>}
        {error && <div style={{color: 'red'}}>{t('profile.errorOrders', { defaultValue: 'Error:' }) + ' ' + error}</div>}
        {!loading && !error && filteredOrders.length === 0 && <div>{t('profile.noAssignedOrders', { defaultValue: 'No tienes órdenes asignadas.' })}</div>}
        <div className={styles.ordersList}>
          {filteredOrders.map((order) => (
            <div key={order._id} className={styles.orderCard}>
              <div className={styles.orderTitle}>{order.titulo}</div>
              <span className={styles.orderStatus}>{t(`workOrders.${order.estado}`, { defaultValue: order.estado })}</span>
              <div className={styles.orderMeta}>{t('workOrders.installation', { defaultValue: 'Instalación' })}: {order.instalacion?.company || order.instalacionId}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 