import React from 'react'
import styles from './panelAdmin.module.css'

const PanelAdmin: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administración</h1>
        <p className={styles.subtitle}>Gestión centralizada del sistema</p>
      </div>
      
      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Estadísticas Generales</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Total de Usuarios</h3>
              <p className={styles.statNumber}>0</p>
            </div>
            <div className={styles.statCard}>
              <h3>Tenants Activos</h3>
              <p className={styles.statNumber}>0</p>
            </div>
            <div className={styles.statCard}>
              <h3>Sistemas Activos</h3>
              <p className={styles.statNumber}>0</p>
            </div>
            <div className={styles.statCard}>
              <h3>Configuraciones</h3>
              <p className={styles.statNumber}>0</p>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Acciones de Administración</h2>
          <div className={styles.actionsGrid}>
            <button className={styles.actionButton}>
              <span>Gestionar Usuarios</span>
            </button>
            <button className={styles.actionButton}>
              <span>Gestionar Tenants</span>
            </button>
            <button className={styles.actionButton}>
              <span>Configuración del Sistema</span>
            </button>
            <button className={styles.actionButton}>
              <span>Logs del Sistema</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Información del Sistema</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3>Versión del Sistema</h3>
              <p>v1.0.0</p>
            </div>
            <div className={styles.infoCard}>
              <h3>Última Actualización</h3>
              <p>No disponible</p>
            </div>
            <div className={styles.infoCard}>
              <h3>Estado del Servidor</h3>
              <p className={styles.statusOnline}>Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PanelAdmin 