import React from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import { translateMonthToCurrentLang } from '../../../shared/utils/backendTranslations'

interface MonthYear {
  month: string
  year: number
}

interface MonthsDisplayModalProps {
  isOpen: boolean
  onRequestClose: () => void
  installationName: string
  startDate: Date | undefined
  endDate: Date | undefined
  frequency: string
  selectedMonths: string[]
}

const MonthsDisplayModal: React.FC<MonthsDisplayModalProps> = ({
  isOpen,
  onRequestClose,
  installationName,
  startDate,
  endDate,
  frequency,
  selectedMonths
}) => {
  const { t, i18n } = useTranslation()

  // Calcular los meses con años basándose en los meses seleccionados y las fechas
  const getMonthsWithYears = (): MonthYear[] => {
    if (!startDate || !endDate || !selectedMonths || selectedMonths.length === 0) return []
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthsWithYears: MonthYear[] = []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Asegurar que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    
    let currentDate = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
    
    // Iterar por cada mes en el rango y filtrar solo los meses seleccionados
    while (currentDate <= endMonth) {
      const monthIndex = currentDate.getMonth()
      const monthName = monthNames[monthIndex]
      const year = currentDate.getFullYear()
      
      // Solo agregar si el mes está en los meses seleccionados
      if (selectedMonths.includes(monthName)) {
        monthsWithYears.push({
          month: monthName,
          year: year
        })
      }
      
      // Avanzar al siguiente mes
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    return monthsWithYears
  }

  const monthsWithYears = getMonthsWithYears()

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onRequestClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Calendar size={20} style={{ marginRight: '8px' }} />
            {t('subscriptions.monthsDetail')}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onRequestClose}
            aria-label={t('common.close')}
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.subscriptionInfo} style={{ marginBottom: '1.5rem' }}>
            <h3>{installationName}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              <strong>{t('subscriptions.table.frequency')}:</strong> {translateMonthToCurrentLang(frequency.charAt(0).toUpperCase() + frequency.slice(1), i18n.language)}
            </p>
            {startDate && endDate && (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                <strong>{t('subscriptions.period')}:</strong>{' '}
                {startDate.toLocaleDateString(i18n.language || 'es', { year: 'numeric', month: 'short', day: 'numeric' })}
                {' - '}
                {endDate.toLocaleDateString(i18n.language || 'es', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.75rem',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '0.5rem'
          }}>
            {monthsWithYears.map((item, index) => (
              <div
                key={`${item.month}-${item.year}-${index}`}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ 
                  fontSize: '0.95rem', 
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  marginBottom: '0.25rem'
                }}>
                  {translateMonthToCurrentLang(item.month, i18n.language)}
                </div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text-secondary)'
                }}>
                  {item.year}
                </div>
              </div>
            ))}
          </div>

          {monthsWithYears.length === 0 && (
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--color-text-secondary)',
              padding: '2rem'
            }}>
              {t('subscriptions.noMonthsAvailable')}
            </p>
          )}

          <div style={{ 
            marginTop: '1.5rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid var(--color-card-border)',
            textAlign: 'center'
          }}>
            <button
              onClick={onRequestClose}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'var(--color-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)'
              }}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthsDisplayModal
