import React from 'react'
import { FileText, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../../../features/installations/styles/Modal.module.css'

interface MaintenanceRecord {
  _id: string
  date: string
  formattedDate?: string
  responses?: any
  pdfUrl: string
}

interface MaintenanceHistoryModalProps {
  isOpen: boolean
  onRequestClose: () => void
  maintenances: MaintenanceRecord[]
  deviceName: string
  loading?: boolean
}

const MaintenanceHistoryModal: React.FC<MaintenanceHistoryModalProps> = ({
  isOpen,
  onRequestClose,
  maintenances,
  deviceName,
  loading = false,
}) => {
  const { t } = useTranslation()

  // Logging para debugging
  React.useEffect(() => {
    if (isOpen && maintenances) {
      console.log('📝 [MODAL] MaintenanceHistoryModal abierto')
      console.log('📝 Total mantenimientos:', maintenances.length)
      maintenances.forEach((m, index) => {
        console.log(`   [${index + 1}] _id:`, m._id)
        console.log(`   [${index + 1}] pdfUrl:`, m.pdfUrl || '❌ NO TIENE pdfUrl')
      })
    }
  }, [isOpen, maintenances])

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenPDF = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('maintenanceHistory.title', 'Historial de Mantenimientos')}</h2>
            <p className={styles.installationInfo}>{deviceName}</p>
          </div>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loaderContainer}>
              <div className={styles.spinner}></div>
              <p>{t('maintenanceHistory.loading', 'Cargando historial...')}</p>
            </div>
          ) : maintenances.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>{t('maintenanceHistory.noMaintenances', 'No hay mantenimientos registrados para este dispositivo')}</p>
              <p className={styles.emptyStateSubtext}>{t('maintenanceHistory.noMaintenancesSubtext', 'Este dispositivo aún no tiene registros de mantenimiento')}</p>
            </div>
          ) : (
            <div className={styles.listContainer}>
              {maintenances.map((maintenance, index) => (
                <div key={maintenance._id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemTitle}>
                      <FileText size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                      {t('maintenanceHistory.maintenanceNumber', 'Mantenimiento #')} {maintenances.length - index}
                    </h3>
                    {maintenance.responses?.observaciones && (
                      <p className={styles.itemDescription}>
                        {maintenance.responses.observaciones}
                      </p>
                    )}
                    <p className={styles.itemDate}>
                      <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {maintenance.formattedDate || formatDate(maintenance.date)}
                    </p>
                  </div>
                  {maintenance.pdfUrl ? (
                    <button
                      onClick={() => {
                        console.log('👆 Click en Ver PDF:', maintenance.pdfUrl)
                        handleOpenPDF(maintenance.pdfUrl)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, var(--color-secondary) 0%, #047857 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(5, 126, 116, 0.3)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 126, 116, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(5, 126, 116, 0.3)'
                      }}
                    >
                      <FileText size={16} />
                      {t('maintenanceHistory.viewPDF', 'Ver Reporte PDF')}
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ❌ PDF no disponible
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={`${styles.modalButton} ${styles.secondary}`}
            onClick={onRequestClose}
          >
            {t('maintenanceHistory.close', 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceHistoryModal
