import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { FiArrowLeft } from "react-icons/fi";
import { useUserProfile } from "../features/profile/hooks/useUserProfile";
import SearchInput from "../shared/components/Inputs/SearchInput";
import styles from "../features/profile/styles/profile.module.css";

const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { role: currentUserRole } = useAuthStore();
  const { user, role, orders, loading, error } = useUserProfile(userId || "");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Verificar que solo los admins puedan acceder
  if (currentUserRole !== "admin") {
    navigate("/inicio");
    return null;
  }

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

  const handleGoBack = () => {
    navigate("/personal");
  };

  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>{t('personal.loadingTechnicians')}</div>
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
        <div className={styles.profileAvatar}>
          {user ? user[0] : "?"}
        </div>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>{user}</span>
          <span className={styles.profileRole}>{role}</span>
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

export default UserProfile; 