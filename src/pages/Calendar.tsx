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
import { FilterX, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react"
import { useTheme } from "../shared/hooks/useTheme"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import i18n from "../i18n"
import { translatePriority } from "../shared/utils/backendTranslations"
import { useAuthStore } from "../store/authstore"
import { compareDates, parseDateString, normalizeDate } from "../features/calendar/utils/dateUtils"
import { useTimeZone } from "../features/calendar/hooks/useTimeZone"
import TimeZoneInfo from "../features/calendar/components/TimeZoneInfo"
import { isClient } from "../shared/utils/roleUtils"

const Calendar = () => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const { workOrders, loading, error, loadWorkOrders, startWorkOrder, technicians, loadTechnicians } = useCalendar()

  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedDateFilter, setSelectedDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTechnician, setSelectedTechnician] = useState("")

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isYearModalOpen, setIsYearModalOpen] = useState(false)
  const [yearList, setYearList] = useState<number[]>([])
  const role = useAuthStore((s) => s.role)
  const isClientUser = role && isClient(role)

  const { timeZone, offset } = useTimeZone()

  useEffect(() => {
    document.title = t("calendar.titlePage")
    loadTechnicians()
  }, [t])

  useEffect(() => {
    const fetchFilteredData = async () => {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(lastDay)
      endDate.setDate(endDate.getDate() + 7)

      const filters: any = {
        search: searchTerm,
        estado: selectedStatus,
        prioridad: selectedPriority,
        tecnicoId: selectedTechnician,
        startDate: selectedDateFilter || startDate.toISOString().split('T')[0],
        endDate: selectedDateFilter || endDate.toISOString().split('T')[0],
        timezone: timeZone,
        offset: offset,
        limit: 100
      }

      await loadWorkOrders(filters)
    }

    fetchFilteredData()
  }, [loadWorkOrders, searchTerm, selectedStatus, selectedPriority, selectedTechnician, selectedDateFilter, selectedDate, currentDate, timeZone, offset])

  useEffect(() => {
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
    () => {
      const opts = [
        { label: t('calendar.allDates'), value: "" },
        { label: t('calendar.today'), value: "today" },
        { label: t('calendar.thisWeek'), value: "thisWeek" },
        { label: t('calendar.thisMonth'), value: "thisMonth" },
        { label: t('calendar.nextWeek'), value: "nextWeek" },
        { label: t('calendar.nextMonth'), value: "nextMonth" },
        { label: t('calendar.selectDate'), value: "custom" },
      ]

      if (selectedDate === 'custom' && selectedDateFilter) {
        const customOpt = opts.find(o => o.value === 'custom')
        if (customOpt) {
          customOpt.label = parseDateString(selectedDateFilter).toLocaleDateString(i18n.language || 'es', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }
      }
      return opts
    },
    [t, selectedDate, selectedDateFilter],
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

      let matchesDate = true

      if (selectedDateFilter) {
        matchesDate = compareDates(order.fechaProgramada, selectedDateFilter);
      } else if (selectedDate) {
        const orderDate = normalizeDate(order.fechaProgramada)
        const today = new Date()

        switch (selectedDate) {
          case "today":
            matchesDate = compareDates(order.fechaProgramada, today)
            break
          case "thisWeek": {
            const startOfWeek = new Date(today)
            startOfWeek.setDate(today.getDate() - today.getDay())
            startOfWeek.setHours(0, 0, 0, 0)
            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 6)
            endOfWeek.setHours(23, 59, 59, 999)
            matchesDate = orderDate >= startOfWeek && orderDate <= endOfWeek
            break
          }
          case "thisMonth": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
            matchesDate = orderDate >= startOfMonth && orderDate <= endOfMonth
            break
          }
          case "nextWeek": {
            const nextWeekStart = new Date(today)
            nextWeekStart.setDate(today.getDate() - today.getDay() + 7)
            const nextWeekEnd = new Date(nextWeekStart)
            nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
            matchesDate = orderDate >= nextWeekStart && orderDate <= nextWeekEnd
            break
          }
          case "nextMonth": {
            const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
            const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)
            matchesDate = orderDate >= nextMonthStart && orderDate <= nextMonthEnd
            break
          }
        }
      }

      const matchesStatus = !selectedStatus || order.estado === selectedStatus
      const matchesPriority = !selectedPriority || order.prioridad === selectedPriority
      const matchesSearch = !term || fields.some((f) => f?.toLowerCase().includes(term))
      const matchesTechnician = !selectedTechnician ||
        (order.tecnico && typeof order.tecnico === 'object' && (order.tecnico as any)._id === selectedTechnician) ||
        order.tecnicoAsignado === selectedTechnician

      return matchesStatus && matchesPriority && matchesSearch && matchesDate && matchesTechnician
    })
  }, [workOrders, selectedStatus, selectedPriority, selectedDate, selectedDateFilter, searchTerm, selectedTechnician])

  const getEventStatusColor = (estado) => {
    switch (estado) {
      case "pendiente": return "#FFD600";
      case "asignada": return "#00B8D9";
      case "en_progreso": return "#FF9100";
      case "completada": return "#00C853";
      case "cancelada": return "#D50000";
      default: return "#212121";
    }
  }

  const handleOpenDetails = (order: WorkOrder) => {
    setSelectedWorkOrder(order)
    setIsDetailsModalOpen(true)
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
    setSelectedDate("custom")
  }

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
            <ChevronLeft size={24} className={dark ? styles.dark : styles.light} />
          </button>
          <h2 className={styles.monthTitle}>
            {monthName} <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsYearModalOpen(true)}>{year}</span>
          </h2>
          <button onClick={() => navigateMonth(1)} className={styles.navButton}>
            <ChevronRight size={24} className={dark ? styles.dark : styles.light} />
          </button>
        </div>

        <div className={styles.calendarGrid}>
          <div className={styles.weekDays}>
            {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map((day) => (
              <div key={day} className={styles.weekDay}>{day}</div>
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
                        <span style={{ fontSize: 10 }}>{translatePriority(order.prioridad)}</span>
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

  const getTechnicianLabel = (tech) => {
    const label = t(`technicians.${tech.userName}`, tech.userName)
    return typeof label === 'string' ? label : tech.userName
  }

  return (
    <>
      <div className={styles.containerCalendar}>
        <div className={styles.topSection}>
          <div className={styles.titleContainer}>
            <h1 className={styles.title}>{t('calendar.title')}</h1>
            <TimeZoneInfo />
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
              className={styles.tallSelect}
            />

            <HybridSelect
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={priorityOptions}
              placeholder={t('common.all')}
              autoSize={true}
              className={styles.tallSelect}
            />

            <HybridSelect
              value={selectedDate}
              onChange={(val) => {
                if (val === 'custom') {
                  setIsDatePickerOpen(true)
                  setSelectedDate(val)
                } else {
                  setSelectedDate(val)
                  setSelectedDateFilter("")
                }
              }}
              options={dateOptions}
              placeholder={t('calendar.allDates')}
              autoSize={true}
              className={styles.tallSelect}
            />

            <button
              onClick={() => setIsDatePickerOpen(true)}
              className={styles.customDateButton}
              type="button"
            >
              <CalendarIcon size={18} className={styles.dateButtonIcon} />
              {selectedDateFilter ? (
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                  {parseDateString(selectedDateFilter).toLocaleDateString(i18n.language || 'es', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
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
                setCurrentDate(new Date())
              }}
              className={styles.clearFilters}
            >
              <FilterX size={22} strokeWidth={3} />
              {t('calendar.clearFilters')}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.skeletonGrid}>
                {[1, 2, 3].map((_, i) => <Skeleton key={i} height={120} width={"100%"} style={{ borderRadius: 14 }} />)}
              </div>
              <Skeleton height={300} width={"100%"} style={{ borderRadius: 14 }} />
            </div>
          ) : error ? (
            <p className={styles.error}>Error: {error}</p>
          ) : (
            renderCalendarView()
          )}
        </div>
      </div>

      <ModalWorkOrderDetails
        isOpen={isDetailsModalOpen}
        onRequestClose={() => setIsDetailsModalOpen(false)}
        workOrder={selectedWorkOrder}
        onStart={!isClientUser ? handleStart : undefined}
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
        <div
          className={styles.datePickerBackdrop}
          onClick={(e) => { if (e.target === e.currentTarget) setIsYearModalOpen(false); }}
        >
          <div className={styles.datePickerModal}>
            <div className={styles.datePickerHeader}>
              <div style={{ width: 40 }} />
              <h2 className={styles.datePickerTitle}>{t('calendar.selectYear') || 'Selecciona un año'}</h2>
              <button
                type="button"
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
                      type="button"
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
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Calendar
