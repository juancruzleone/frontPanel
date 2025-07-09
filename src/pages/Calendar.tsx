"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/calendar/styles/calendar.module.css"
import useCalendar, { type WorkOrder } from "../features/calendar/hooks/useCalendar"
import ModalWorkOrderDetails from "../features/calendar/components/ModalWorkOrderDetails"
import ModalSuccess from "../features/workOrders/components/ModalSuccess"
import { CalendarIcon, Clock, MapPin, User, AlertCircle } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'

const Calendar = () => {
  const { workOrders, loading, error, loadWorkOrders, startWorkOrder, assignTechnician, completeWorkOrder } =
    useCalendar()

  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    document.title = "Calendario de Órdenes | LeoneSuite"
    loadWorkOrders()
  }, [loadWorkOrders])

  const statusOptions = useMemo(
    () => [
      { label: "Todas", value: "" },
      { label: "Pendiente", value: "pendiente" },
      { label: "Asignada", value: "asignada" },
      { label: "En Progreso", value: "en_progreso" },
      { label: "Completada", value: "completada" },
      { label: "Cancelada", value: "cancelada" },
    ],
    [],
  )

  const priorityOptions = useMemo(
    () => [
      { label: "Todas", value: "" },
      { label: "Baja", value: "baja" },
      { label: "Media", value: "media" },
      { label: "Alta", value: "alta" },
      { label: "Crítica", value: "critica" },
    ],
    [],
  )

  const dateOptions = useMemo(
    () => [
      { label: "Todas las fechas", value: "" },
      { label: "Hoy", value: "today" },
      { label: "Esta semana", value: "thisWeek" },
      { label: "Este mes", value: "thisMonth" },
      { label: "Próxima semana", value: "nextWeek" },
      { label: "Próximo mes", value: "nextMonth" },
    ],
    [],
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

      const matchesStatus = !selectedStatus || order.estado === selectedStatus
      const matchesPriority = !selectedPriority || order.prioridad === selectedPriority
      const matchesSearch = fields.some((f) => f?.toLowerCase().includes(term))

      return matchesStatus && matchesPriority && matchesSearch && matchesDate
    })
  }, [workOrders, selectedStatus, selectedPriority, selectedDate, searchTerm])

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
    setIsDetailsModalOpen(false)
    await loadWorkOrders()
  }

  const handleStart = async (id: string) => {
    try {
      await startWorkOrder(id)
      onSuccess("Orden iniciada con éxito")
    } catch {
      onSuccess("Error al iniciar orden")
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
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dayOrders = filteredWorkOrders.filter((order) => {
        const orderDate = new Date(order.fechaProgramada)
        return orderDate.toDateString() === current.toDateString()
      })

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        orders: dayOrders,
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calendarDays = generateCalendarDays()

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  const renderCalendarView = () => {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

    return (
      <div className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <button onClick={() => navigateMonth(-1)} className={styles.navButton}>
            ←
          </button>
          <h2 className={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={() => navigateMonth(1)} className={styles.navButton}>
            →
          </button>
        </div>

        <div className={styles.calendarGrid}>
          {dayNames.map((day) => (
            <div key={day} className={styles.dayHeader}>
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`${styles.calendarDay} ${
                !day.isCurrentMonth ? styles.otherMonth : ""
              } ${day.isToday ? styles.today : ""}`}
            >
              <div className={styles.dayNumber}>{day.date.getDate()}</div>
              <div className={styles.dayOrders}>
                {day.orders.slice(0, 3).map((order) => (
                  <div
                    key={order._id}
                    className={styles.orderItem}
                    style={{
                      backgroundColor: getStatusColor(order.estado),
                      borderLeft: `4px solid ${getPriorityColor(order.prioridad)}`,
                    }}
                    onClick={() => handleOpenDetails(order)}
                    title={`${order.titulo} - ${order.estado}`}
                  >
                    <span className={styles.orderTime}>{order.horaProgramada}</span>
                    <span className={styles.orderTitle}>{order.titulo}</span>
                  </div>
                ))}
                {day.orders.length > 3 && <div className={styles.moreOrders}>+{day.orders.length - 3} más</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const groupedOrders = filteredWorkOrders.reduce(
      (groups, order) => {
        const date = new Date(order.fechaProgramada).toDateString()
        if (!groups[date]) {
          groups[date] = []
        }
        groups[date].push(order)
        return groups
      },
      {} as Record<string, WorkOrder[]>,
    )

    return (
      <div className={styles.listContainer}>
        {Object.entries(groupedOrders)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, orders]) => (
            <div key={date} className={styles.dateGroup}>
              <h3 className={styles.dateHeader}>
                {new Date(date).toLocaleDateString("es-ES", {
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
                      Ver Detalles
                    </button>
                    <button className={styles.fullDetailsButton} onClick={() => handleViewWorkOrderDetails(order)}>
                      Ver Completo
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
            Calendario de Órdenes de Trabajo
          </h1>

          <div className={styles.viewModeButtons}>
            <button
              className={`${styles.viewButton} ${viewMode === "month" ? styles.active : ""}`}
              onClick={() => setViewMode("month")}
            >
              Mes
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === "list" ? styles.active : ""}`}
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
          </div>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.searchContainer}>
            <SearchInput
              placeholder="Buscar por título, descripción, instalación o técnico"
              showSelect
              selectPlaceholder="Filtrar por estado"
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

            <button
              onClick={() => {
                setSelectedStatus("")
                setSelectedPriority("")
                setSelectedDate("")
                setSearchTerm("")
              }}
              className={styles.clearFilters}
            >
              Limpiar Filtros
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
            <p className={styles.noResults}>No se encontraron órdenes de trabajo</p>
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
      />

      <ModalSuccess
        isOpen={!!responseMessage}
        onRequestClose={() => setResponseMessage("")}
        mensaje={responseMessage}
      />
    </>
  )
}

export default Calendar
