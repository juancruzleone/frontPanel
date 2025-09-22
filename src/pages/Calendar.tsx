"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import HybridSelect from "../shared/components/HybridSelect"
import styles from "../features/calendar/styles/calendar.module.css"
import useCalendar, { type WorkOrder } from "../features/calendar/hooks/useCalendar"
import ModalWorkOrderDetails from "../features/calendar/components/ModalWorkOrderDetails"
import ModalSuccess from "../features/workOrders/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import DatePickerModal from "../features/calendar/components/DatePickerModal"
import { CalendarIcon, Clock, MapPin, User, AlertCircle, FilterX, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { useTheme } from "../shared/hooks/useTheme"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import i18n from "../i18n"
import { translateWorkOrderStatus, translatePriority, translateWorkType } from "../shared/utils/backendTranslations"
import { useAuthStore } from "../store/authStore"
import { updateWorkOrder } from "../features/workOrders/services/workOrderServices"
import { formatDateToString, compareDates, parseDateString } from "../features/calendar/utils/dateUtils"
import { useTimeZone } from "../features/calendar/hooks/useTimeZone"
import TimeZoneInfo from "../features/calendar/components/TimeZoneInfo"

// Componente personalizado para selects que se ajustan automáticamente
interface AutoSizeSelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}

const AutoSizeSelect = ({ value, onChange, options, placeholder, className }: AutoSizeSelectProps) => {
  const { dark } = useTheme();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [selectWidth, setSelectWidth] = useState<number>(180);

  // Calcular el ancho necesario basado en el texto más largo
  useEffect(() => {
    if (selectRef.current) {
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontFamily = 'Encode Sans, sans-serif';
      tempSpan.style.fontWeight = '500';
      tempSpan.style.padding = '12px 40px 12px 16px';
      
      document.body.appendChild(tempSpan);
      
      // Encontrar el texto más largo
      let maxWidth = 0;
      const allTexts = [placeholder || '', ...options.map(opt => opt.label)];
      
      allTexts.forEach(text => {
        tempSpan.textContent = text;
        const width = tempSpan.offsetWidth;
        if (width > maxWidth) {
          maxWidth = width;
        }
      });
      
      document.body.removeChild(tempSpan);
      
      // Establecer el ancho mínimo de 180px o el ancho calculado, lo que sea mayor
      setSelectWidth(Math.max(180, maxWidth + 20)); // +20 para padding extra
    }
  }, [options, placeholder]);

  return (
    <div className={styles.selectWrapper} style={{ width: selectWidth }}>
      <select
        ref={selectRef}
        value={value}
        onChange={onChange}
        className={`${styles.filterSelect} ${styles.select} ${className || ''}`}
        style={{ width: selectWidth }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown 
        size={16} 
        className={`${styles.selectIcon} ${dark ? styles.dark : styles.light}`}
      />
    </div>
  );
};

const Calendar = () => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const { workOrders, loading, error, loadWorkOrders, startWorkOrder, assignTechnician, completeWorkOrder, technicians, loadTechnicians } = useCalendar()

  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedDateFilter, setSelectedDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTechnician, setSelectedTechnician] = useState("")

  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isYearModalOpen, setIsYearModalOpen] = useState(false)
  const [yearList, setYearList] = useState<number[]>([])
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    document.title = t("calendar.titlePage")
    loadTechnicians()
  }, [t, i18n.language])

  useEffect(() => {
    loadWorkOrders()
  }, [loadWorkOrders])

  useEffect(() => {
    // Generar lista de años desde 2000 hasta 20 años después del actual
    const current = new Date().getFullYear()
    const years = []
    for (let y = 2000; y <= current + 20; y++) {
      years.push(y)
    }
    setYearList(years)
  }, [])

  const statusOptions = useMemo(
    () => [
      { label: t('common.all'), value: "" },
      { label: t('workOrders.pending'), value: "pendiente" },
      { label: t('workOrders.assigned'), value: "asignada" },
      { label: t('workOrders.inProgress'), value: "en_progreso" },
      { label: t('workOrders.completed'), value: "completada" },
      { label: t('workOrders.cancelled'), value: "cancelada" },
    ],
    [t],
  )

  const priorityOptions = useMemo(
    () => [
      { label: t('common.all'), value: "" },
      { label: t('calendar.low'), value: "baja" },
      { label: t('calendar.medium'), value: "media" },
      { label: t('calendar.high'), value: "alta" },
      { label: t('calendar.critical'), value: "critica" },
    ],
    [t],
  )

  const dateOptions = useMemo(
    () => [
      { label: t('calendar.allDates'), value: "" },
      { label: t('calendar.today'), value: "today" },
      { label: t('calendar.thisWeek'), value: "thisWeek" },
      { label: t('calendar.thisMonth'), value: "thisMonth" },
      { label: t('calendar.nextWeek'), value: "nextWeek" },
      { label: t('calendar.nextMonth'), value: "nextMonth" },
    ],
    [t],
  )

  const filteredWorkOrders = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return workOrders.filter((order) => {
      if (!order) return false

      const fields = [
        order.titulo,
        order.descripcion,
        order.instalacion?.company,
        order.instalacion?.address,
        order.instalacion?.city,
        order.tecnico ? (order.tecnico as any).userName : null,
        order.tipoTrabajo,
      ].filter(Boolean)

      const orderDate = new Date(order.fechaProgramada)
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const nextWeekStart = new Date(startOfWeek)
      nextWeekStart.setDate(startOfWeek.getDate() + 7)
      const nextWeekEnd = new Date(nextWeekStart)
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
      const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)

      let matchesDate = true
      
      // Si hay un filtro de fecha específica, tiene prioridad sobre otros filtros de fecha
      if (selectedDateFilter) {
        matchesDate = compareDates(order.fechaProgramada, selectedDateFilter);
      } else if (selectedDate) {
        // Solo aplicar filtros de fecha relativa si no hay fecha específica
        switch (selectedDate) {
          case "today":
            matchesDate = compareDates(order.fechaProgramada, today);
            break
          case "thisWeek":
            matchesDate = orderDate >= startOfWeek && orderDate <= endOfWeek
            break
          case "thisMonth":
            matchesDate = orderDate >= startOfMonth && orderDate <= endOfMonth
            break
          case "nextWeek":
            matchesDate = orderDate >= nextWeekStart && orderDate <= nextWeekEnd
            break
          case "nextMonth":
            matchesDate = orderDate >= nextMonthStart && orderDate <= nextMonthEnd
            break
        }
      }

      const matchesStatus = !selectedStatus || order.estado === selectedStatus
      const matchesPriority = !selectedPriority || order.prioridad === selectedPriority
      const matchesSearch = fields.some((f) => f?.toLowerCase().includes(term))
      const matchesTechnician = !selectedTechnician || (order.tecnico && typeof order.tecnico === 'object' && (order.tecnico as any)._id === selectedTechnician) || order.tecnicoAsignado === selectedTechnician

      return matchesStatus && matchesPriority && matchesSearch && matchesDate && matchesTechnician
    })
  }, [workOrders, selectedStatus, selectedPriority, selectedDate, selectedDateFilter, searchTerm, selectedTechnician])

  // NUEVO: función para color por estado
  const getEventStatusColor = (estado) => {
    switch (estado) {
      case "pendiente": return "#FFD600";      // Amarillo fuerte
      case "asignada": return "#00B8D9";       // Celeste
      case "en_progreso": return "#FF9100";    // Naranja
      case "completada": return "#00C853";     // Verde
      case "cancelada": return "#D50000";      // Rojo
      default: return "#212121";                // Negro por defecto
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "baja":
        return "#4CAF50"
      case "media":
        return "#FFC107"
      case "alta":
        return "#FF9800"
      case "critica":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "#9E9E9E"
      case "asignada":
        return "#2196F3"
      case "en_progreso":
        return "#FF9800"
      case "completada":
        return "#4CAF50"
      case "cancelada":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const handleOpenDetails = (order: WorkOrder) => {
    setSelectedWorkOrder(order)
    setIsDetailsModalOpen(true)
  }

  const handleViewWorkOrderDetails = (order: WorkOrder) => {
    if (order._id) navigate(`/ordenes-trabajo/${order._id}`)
  }

  const onSuccess = async (msg: string) => {
    setResponseMessage(msg)
    setIsError(false)
    setIsDetailsModalOpen(false)
    await loadWorkOrders()
  }

  const onError = async (msg: string) => {
    setResponseMessage(msg)
    setIsError(true)
    setIsDetailsModalOpen(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleStart = async (id: string) => {
    try {
      await startWorkOrder(id)
      onSuccess(t('calendar.orderStarted'))
    } catch (err: any) {
      onError(err.message || t('calendar.errorStartingOrder'))
    }
  }

  const handleOpenDatePicker = () => {
    setIsDatePickerOpen(true)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDateFilter(date)
  }

  // Generar días del mes para la vista de calendario
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDay = new Date(startDate)

    while (currentDay <= lastDay || days.length < 42) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const renderCalendarView = () => {
    const days = generateCalendarDays()
    const currentLanguage = i18n.language || 'es'
    const monthName = currentDate.toLocaleDateString(currentLanguage, { month: "long" })
    const year = currentDate.getFullYear()

    return (
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <button onClick={() => navigateMonth(-1)} className={styles.navButton}>
            <ChevronLeft 
              size={24} 
              className={dark ? styles.dark : styles.light}
            />
          </button>
          <h2 className={styles.monthTitle}>
            {monthName} <span style={{cursor:'pointer', textDecoration:'underline'}} onClick={() => setIsYearModalOpen(true)}>{year}</span>
          </h2>
          <button onClick={() => navigateMonth(1)} className={styles.navButton}>
            <ChevronRight 
              size={24} 
              className={dark ? styles.dark : styles.light}
            />
          </button>
        </div>

        <div className={styles.calendarGrid}>
          <div className={styles.weekDays}>
            {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map((day) => (
              <div key={day} className={styles.weekDay}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {days.map((day, index) => {
              const dayOrders = filteredWorkOrders.filter((order) => {
                return compareDates(order.fechaProgramada, day);
              })

              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = compareDates(day, new Date())

              return (
                <div
                  key={index}
                  className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ""} ${isToday ? styles.today : ""}`}
                >
                  <div className={styles.dayNumber}>{day.getDate()}</div>
                  <div className={styles.dayOrders}>
                    {dayOrders.slice(0, 3).map((order) => (
                      <div
                        key={order._id}
                        className={styles.orderIndicator}
                        style={{ backgroundColor: getEventStatusColor(order.estado), color: '#000', fontWeight: 700 }}
                        title={`${order.titulo} - ${translatePriority(order.prioridad)}`}
                        onClick={() => handleOpenDetails(order)}
                      >
                        <span className={styles.orderTitle}>{order.titulo}</span>
                        <span style={{fontSize:10}}>{translatePriority(order.prioridad)}</span>
                      </div>
                    ))}
                    {dayOrders.length > 3 && (
                      <div className={styles.moreOrders}>+{dayOrders.length - 3} {t('calendar.moreOrders')}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const groupedOrders = filteredWorkOrders.reduce((acc, order) => {
      // Usar la función utilitaria para normalizar la fecha
      const dateString = formatDateToString(order.fechaProgramada);
      const dateKey = new Date(dateString).toDateString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(order)
      return acc
    }, {} as Record<string, WorkOrder[]>)

    return (
      <div className={styles.listContainer}>
        {Object.entries(groupedOrders)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, orders]) => (
            <div key={date} className={styles.dateGroup}>
              <h3 className={styles.dateHeader}>
                {new Date(date).toLocaleDateString(i18n.language || 'es', {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              {orders.map((order) => (
                <div key={order._id} className={styles.workOrderCard}>
                  <div className={styles.workOrderInfo}>
                    <div className={styles.workOrderHeader}>
                      <h4 className={styles.workOrderTitle}>{order.titulo}</h4>
                      <div className={styles.badges}>
                        <span
                          className={styles.priorityBadge}
                          style={{ backgroundColor: getPriorityColor(order.prioridad) }}
                        >
                          {translatePriority(order.prioridad)}
                        </span>
                        <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(order.estado) }}>
                          {translateWorkOrderStatus(order.estado)}
                        </span>
                      </div>
                    </div>

                    {/* Descripción arriba */}
                    <p className={styles.workOrderDescription}>{order.descripcion}</p>

                    <div className={styles.workOrderDetails}>
                      <div className={styles.workOrderInfoRow}>
                        <span>
                          <strong>{t('calendar.type')}:</strong> {translateWorkType(order.tipoTrabajo)}
                        </span>
                        <span>
                          <strong>{t('calendar.time')}:</strong> {order.horaProgramada}
                        </span>
                        {order.instalacion && (
                          <span>
                            <strong>{t('calendar.installation')}:</strong> {order.instalacion.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.detailsButton} onClick={() => handleOpenDetails(order)}>
                      {t('calendar.viewDetails')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    )
  }

  const getTechnicianLabel = (tech) => {
    const label = t(`technicians.${tech.userName}`, tech.userName)
    return typeof label === 'string' ? label : tech.userName
  }

  return (
    <>
      <div className={styles.containerCalendar}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('calendar.title')}
          </h1>

          <TimeZoneInfo showDetails={true} />

          <div className={styles.viewModeButtons}>
            <button
              className={`${styles.viewButton} ${viewMode === "month" ? styles.active : ""}`}
              onClick={() => setViewMode("month")}
            >
              {t('calendar.month')}
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
              onClick={() => setViewMode("list")}
            >
              {t('calendar.list')}
            </button>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchContainer}>
            <SearchInput
              placeholder={t('calendar.searchPlaceholder')}
              showSelect
              selectPlaceholder={t('calendar.filterByStatus')}
              selectOptions={statusOptions}
              onInputChange={setSearchTerm}
              onSelectChange={setSelectedStatus}
            />
          </div>

          <div className={styles.additionalFilters}>
            <HybridSelect
              value={selectedTechnician}
              onChange={setSelectedTechnician}
              options={[
                { value: "", label: t('calendar.allTechnicians') || 'Todos los técnicos' },
                ...technicians.map(tech => ({ label: getTechnicianLabel(tech), value: tech._id }))
              ]}
              placeholder={t('calendar.allTechnicians') || 'Todos los técnicos'}
              autoSize={true}
            />
            
            <HybridSelect
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={priorityOptions}
              placeholder={t('common.all')}
              autoSize={true}
            />

            <HybridSelect
              value={selectedDate}
              onChange={setSelectedDate}
              options={dateOptions}
              placeholder={t('calendar.allDates')}
              autoSize={true}
            />

            <button
              onClick={handleOpenDatePicker}
              className={styles.customDateButton}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.dateButtonIcon}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {selectedDateFilter ? (
                <>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                    {parseDateString(selectedDateFilter).toLocaleDateString(i18n.language || 'es', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>

                </>
              ) : (
                t('calendar.selectDate')
              )}
            </button>

            <button
              onClick={() => {
                setSelectedStatus("")
                setSelectedPriority("")
                setSelectedDate("")
                setSelectedDateFilter("")
                setSearchTerm("")
                setSelectedTechnician("")
                setCurrentDate(new Date()) // Reiniciar el año a la fecha actual
              }}
              className={styles.clearFilters}
            >
              <FilterX size={16} />
              {t('calendar.clearFilters')}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <>
              <div className={styles.cardsRow}>
                {[1,2,3].map((_,i) => <Skeleton key={i} height={120} width={"100%"} style={{borderRadius:14, marginBottom:16}} />)}
              </div>
              <Skeleton height={220} width={"100%"} style={{borderRadius:14, marginTop:16}} />
            </>
          ) : error ? (
            <p className={styles.error}>Error: {error}</p>
          ) : (
            <>

              {filteredWorkOrders.length === 0 ? (
                <p className={styles.noResults}>
                  {selectedDateFilter 
                    ? `No se encontraron órdenes de trabajo para el ${parseDateString(selectedDateFilter).toLocaleDateString(i18n.language || 'es', {
                        weekday: 'long',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}`
                    : t('calendar.noOrders')
                  }
                </p>
              ) : (
                viewMode === "month" ? renderCalendarView() : renderListView()
              )}
            </>
          )}
        </div>
      </div>

      <ModalWorkOrderDetails
        isOpen={isDetailsModalOpen}
        onRequestClose={() => setIsDetailsModalOpen(false)}
        workOrder={selectedWorkOrder}
        onStart={handleStart}
        onSuccess={onSuccess}
        onError={onError}
      />

      <ModalSuccess
        isOpen={!!responseMessage && !isError}
        onRequestClose={closeModal}
        mensaje={responseMessage}
      />

      <ModalError
        isOpen={!!responseMessage && isError}
        onRequestClose={closeModal}
        mensaje={responseMessage}
      />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onRequestClose={() => setIsDatePickerOpen(false)}
        onDateSelect={handleDateSelect}
        selectedDate={selectedDateFilter}
        title={t('calendar.selectDate')}
      />
      {isYearModalOpen && (
        <div className={styles.datePickerBackdrop}>
          <div className={styles.datePickerModal}>
            <div className={styles.datePickerHeader}>
              <div className={styles.datePickerIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#3b82f6"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className={styles.datePickerTitle}>{t('calendar.selectYear') || 'Selecciona un año'}</h2>
              <button 
                className={styles.datePickerCloseButton}
                onClick={() => setIsYearModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.datePickerContent}>
              <div className={styles.yearPickerContainer}>
                <div className={styles.yearPickerGrid}>
                  {yearList.map(y => (
                    <button
                      key={y}
                      className={`${styles.yearPickerYear} ${y === currentDate.getFullYear() ? styles.yearPickerSelected : ''}`}
                      onClick={() => {
                        setCurrentDate(new Date(y, currentDate.getMonth(), 1));
                        setIsYearModalOpen(false);
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.datePickerActions}>
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  className={styles.datePickerCancelButton}
                >
                  {t('common.cancel') || 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Calendar
