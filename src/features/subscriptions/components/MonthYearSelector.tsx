import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import styles from '../styles/monthYearSelector.module.css'

interface MonthYearSelectorProps {
  startDate: string
  endDate: string
  selectedMonths: string[]
  onMonthClick: (month: string) => void
  frequency: string
  disabled?: boolean
  error?: string
}

const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  startDate,
  endDate,
  selectedMonths,
  onMonthClick,
  frequency,
  disabled = false,
  error
}) => {
  const { t } = useTranslation()

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // Calcular los años que abarca el abono
  const years = useMemo(() => {
    if (!startDate || !endDate) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []
    
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    
    const yearsList = []
    for (let year = startYear; year <= endYear; year++) {
      yearsList.push(year)
    }
    
    return yearsList
  }, [startDate, endDate])

  // Determinar qué meses están disponibles para cada año
  const getAvailableMonthsForYear = (year: number) => {
    if (!startDate || !endDate) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    const startMonth = start.getMonth()
    const endMonth = end.getMonth()
    
    let availableMonths: number[] = []
    
    if (year === startYear && year === endYear) {
      // Si inicio y fin están en el mismo año
      for (let m = startMonth; m <= endMonth; m++) {
        availableMonths.push(m)
      }
    } else if (year === startYear) {
      // Primer año: desde mes de inicio hasta diciembre
      for (let m = startMonth; m <= 11; m++) {
        availableMonths.push(m)
      }
    } else if (year === endYear) {
      // Último año: desde enero hasta mes de fin
      for (let m = 0; m <= endMonth; m++) {
        availableMonths.push(m)
      }
    } else {
      // Años intermedios: todos los meses
      for (let m = 0; m <= 11; m++) {
        availableMonths.push(m)
      }
    }
    
    return availableMonths
  }

  const isMonthSelectable = (monthIndex: number, year: number) => {
    if (disabled) return false
    if (!frequency || frequency === 'semanal' || frequency === 'quincenal') return false
    
    const availableMonths = getAvailableMonthsForYear(year)
    return availableMonths.includes(monthIndex)
  }

  const isMonthSelected = (month: string) => {
    return selectedMonths.includes(month)
  }

  const handleMonthClick = (monthName: string, monthIndex: number, year: number) => {
    if (!isMonthSelectable(monthIndex, year)) return
    onMonthClick(monthName)
  }

  const getHelperText = () => {
    switch (frequency) {
      case 'semestral':
        return t('subscriptions.selectTwoMonthsSemestral')
      case 'trimestral':
        return t('subscriptions.selectFourMonthsTrimestral')
      case 'anual':
        return t('subscriptions.selectOneMonth')
      case 'mensual':
        return t('subscriptions.selectAllMonths')
      default:
        return ''
    }
  }

  if (!startDate || !endDate || years.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.warning}>
          {t('subscriptions.selectDatesFirst') || 'Por favor, selecciona primero las fechas de inicio y fin'}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <Calendar size={16} />
        {t('subscriptions.selectedMonths')}
      </label>
      
      <div className={styles.yearsContainer}>
        {years.map(year => {
          const availableMonths = getAvailableMonthsForYear(year)
          
          return (
            <div key={year} className={styles.yearSection}>
              <h4 className={styles.yearTitle}>{year}</h4>
              <div className={styles.monthsGrid}>
                {monthNames.map((month, index) => {
                  const isAvailable = availableMonths.includes(index)
                  const isSelected = isMonthSelected(month)
                  const isClickable = isMonthSelectable(index, year)
                  
                  return (
                    <button
                      key={`${year}-${index}`}
                      type="button"
                      className={`${styles.monthButton} ${
                        isSelected ? styles.selected : ''
                      } ${isAvailable ? styles.available : styles.disabled}`}
                      onClick={() => handleMonthClick(month, index, year)}
                      disabled={!isClickable}
                      title={isAvailable ? month : `${month} (fuera del rango)`}
                    >
                      {month.substring(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      {error && (
        <div className={styles.error}>{error}</div>
      )}
      
      {getHelperText() && (
        <div className={styles.helperText}>
          {getHelperText()}
        </div>
      )}
    </div>
  )
}

export default MonthYearSelector
