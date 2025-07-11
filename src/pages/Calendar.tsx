"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/calendar/styles/calendar.module.css"
import useCalendar, { type WorkOrder } from "../features/calendar/hooks/useCalendar"
import ModalWorkOrderDetails from "../features/calendar/components/ModalWorkOrderDetails"
import ModalSuccess from "../features/workOrders/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import { CalendarIcon, Clock, MapPin, User, AlertCircle, FilterX } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import i18n from "../i18n"

const Calendar = () => {
  const { t } = useTranslation()
  const { workOrders, loading, error, loadWorkOrders, startWorkOrder, assignTechnician, completeWorkOrder } =
    useCalendar()

  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedDateFilter, setSelectedDateFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    document.title = "Calendario de Órdenes | LeoneSuite"
    loadWorkOrders()
  }, [loadWorkOrders])

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
      if (selectedDate) {
        switch (selectedDate) {
          case "today":
            matchesDate = orderDate.toDateString() === today.toDateString()
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

      // Filtro por fecha específica
      if (selectedDateFilter) {
        const filterDate = new Date(selectedDateFilter)
        matchesDate = orderDate.toDateString() === filterDate.toDateString()
      }

      const matchesStatus = !selectedStatus || order.estado === selectedStatus
      const matchesPriority = !selectedPriority || order.prioridad === selectedPriority
      const matchesSearch = fields.some((f) => f?.toLowerCase().includes(term))

      return matchesStatus && matchesPriority && matchesSearch && matchesDate
    })
  }, [workOrders, selectedStatus, selectedPriority, selectedDate, selectedDateFilter, searchTerm])

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
    const monthName = currentDate.toLocaleDateString(currentLanguage, { month: "long", year: "numeric" })

    return (
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <button onClick={() => navigateMonth(-1)} className={styles.navButton}>
            &lt;
          </button>
          <h2 className={styles.monthTitle}>{monthName}</h2>
          <button onClick={() => navigateMonth(1)} className={styles.navButton}>
            &gt;
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
                const orderDate = new Date(order.fechaProgramada)
                return orderDate.toDateString() === day.toDateString()
              })

              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = day.toDateString() === new Date().toDateString()

              return (
                <div
                  key={index}
                  className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ""} ${
                    isToday ? styles.today : ""
                  }`}
                >
                  <div className={styles.dayNumber}>{day.getDate()}</div>
                  <div className={styles.dayOrders}>
                    {dayOrders.slice(0, 3).map((order) => (
                      <div
                        key={order._id}
                        className={styles.orderIndicator}
                        style={{ backgroundColor: getPriorityColor(order.prioridad) }}
                        title={`${order.titulo} - ${order.prioridad}`}
                        onClick={() => handleOpenDetails(order)}
                      >
                        <span className={styles.orderTitle}>{order.titulo}</span>
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
      const date = new Date(order.fechaProgramada).toDateString()
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(order)
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
                          {order.prioridad.toUpperCase()}
                        </span>
                        <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(order.estado) }}>
                          {order.estado.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <p className={styles.workOrderDescription}>{order.descripcion}</p>

                    <div className={styles.workOrderDetails}>
                      <div className={styles.detailItem}>
                        <Clock size={16} />
                        <span>{order.horaProgramada}</span>
                      </div>

                      <div className={styles.detailItem}>
                        <MapPin size={16} />
                        <span>
                          {order.instalacion?.company} - {order.instalacion?.address}
                        </span>
                      </div>

                      {order.tecnico && (
                        <div className={styles.detailItem}>
                          <User size={16} />
                          <span>{(order.tecnico as any).userName}</span>
                        </div>
                      )}

                      <div className={styles.detailItem}>
                        <AlertCircle size={16} />
                        <span>{order.tipoTrabajo}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.detailsButton} onClick={() => handleOpenDetails(order)}>
                      {t('calendar.viewDetails')}
                    </button>
                    <button className={styles.fullDetailsButton} onClick={() => handleViewWorkOrderDetails(order)}>
                      {t('calendar.viewComplete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    )
  }

  return (
    <>
      <div className={styles.containerCalendar}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('calendar.title')}
          </h1>

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
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={styles.filterSelect}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles.filterSelect}
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className={styles.dateFilter}
              placeholder={t('calendar.selectDate')}
            />

            <button
              onClick={() => {
                setSelectedStatus("")
                setSelectedPriority("")
                setSelectedDate("")
                setSelectedDateFilter("")
                setSearchTerm("")
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
          ) : filteredWorkOrders.length === 0 ? (
            <p className={styles.noResults}>{t('calendar.noOrders')}</p>
          ) : (
            <>{viewMode === "month" ? renderCalendarView() : renderListView()}</>
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
    </>
  )
}

export default Calendar
