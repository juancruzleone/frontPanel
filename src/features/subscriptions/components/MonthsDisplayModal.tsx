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

    const currentDate = new Date(start.getFullYear(), start.getMonth(), 1)
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
    <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('subscriptions.installationDetails') || 'Detalle de la instalación'}
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

          <div style={{ padding: '0.5rem 2.5rem 2.5rem 2.5rem' }}>
            <div className={styles.monthsLabel}>
              {t('subscriptions.monthsIncluded') || 'Meses incluidos'}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem',
              width: '100%'
            }}>
              {monthsWithYears.map((item, index) => (
                <div
                  key={`${item.month}-${item.year}-${index}`}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-bg-light)',
                    border: '1px solid var(--color-card-border)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: 'var(--color-text)',
                  }}>
                    {translateMonthToCurrentLang(item.month, i18n.language)}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    fontWeight: '500'
                  }}>
                    {item.year}
                  </div>
                </div>
              ))}
            </div>
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


        </div>
      </div>
    </div>
  )
}

export default MonthsDisplayModal
