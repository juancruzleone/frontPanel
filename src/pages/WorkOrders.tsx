import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../shared/components/Buttons/buttonCreate"
import SearchInput from "../shared/components/Inputs/SearchInput"
import styles from "../features/workOrders/styles/workOrders.module.css"
import useWorkOrders, { type WorkOrder } from "../features/workOrders/hooks/useWorkOrders"
import { type UserPermissions } from "../store/authStore"
import ModalCreate from "../features/workOrders/components/ModalCreate"
import ModalEdit from "../features/workOrders/components/ModalEdit"
import ModalSuccess from "../features/workOrders/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalConfirmDelete from "../features/workOrders/components/ModalConfirmDelete"
import ModalAssignTechnician from "../features/workOrders/components/ModalAssignTechnician"
import ModalCompleteWorkOrder from "../features/workOrders/components/ModalCompleteWorkOrder"
import WorkOrdersTableView from "../features/workOrders/components/WorkOrdersTableView"

import { Edit, Trash, User, Check, Play, HelpCircle, FilterX, Calendar as CalendarIcon, MapPin, Clock, Eye } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import HybridSelect from "../shared/components/HybridSelect"
import DatePickerModal from "../features/calendar/components/DatePickerModal"
import ModalWorkOrderDetails from "../features/calendar/components/ModalWorkOrderDetails"
import { parseDateString } from "../features/calendar/utils/dateUtils"
import { useTimeZone } from "../features/calendar/hooks/useTimeZone"
import { useTranslation } from "react-i18next"
import { translateWorkOrderStatus, translatePriority, translateWorkType, translateOrderType, translateOrderOrigin } from "../shared/utils/backendTranslations"
import { useAuthStore } from "../store/authStore"
import { useWorkOrdersTour } from "../features/workOrders/hooks/useWorkOrdersTour"
import TourButton from "../shared/components/Buttons/TourButton"
import Tooltip from "../shared/components/Tooltip/Tooltip"
import { socketService } from "../shared/services/socketService"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useViewMode } from "../shared/hooks/useViewMode"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"

const renderTechnicianInfo = (order: WorkOrder, t: (key: string) => string) => {
  const namesFromTecnicos = Array.isArray(order.tecnicos)
    ? order.tecnicos.map((tech) => tech.userName).filter(Boolean)
    : []
  const namesFromTecnico = Array.isArray(order.tecnico)
    ? order.tecnico.map((tech: any) => tech?.userName).filter(Boolean)
    : (order.tecnico as any)?.userName
      ? [(order.tecnico as any).userName]
      : []
  const technicianNames = Array.from(new Set([...namesFromTecnicos, ...namesFromTecnico]))
  const technicianIds = Array.from(
    new Set(
      [
        ...(Array.isArray(order.tecnicosAsignados) ? order.tecnicosAsignados : []),
        ...(Array.isArray(order.tecnicosIds) ? order.tecnicosIds : []),
        order.tecnicoAsignado,
      ]
        .filter(Boolean)
        .map((id) => String(id))
    )
  )

  if (technicianNames.length > 0) {
    return (
      <p>
        <strong>{t('workOrders.technician')}:</strong> {technicianNames.join(", ")}
        {order.estado === "asignada" && (
          <span style={{ marginLeft: "8px", color: "#4CAF50", fontSize: "0.8em" }}>({t('workOrders.pendingStart')})</span>
        )}
        {order.estado === "en_progreso" && (
          <span style={{ marginLeft: "8px", color: "#2196F3", fontSize: "0.8em" }}>({t('workOrders.inProgress')})</span>
        )}
      </p>
    )
  }

  if (technicianIds.length > 0) {
    return (
      <p style={{ color: "orange" }}>
        <strong>{t('workOrders.assignedTechnician')}:</strong> ID {technicianIds.join(", ")}
        <br />
        <small>{t('workOrders.loadingTechnicianDetails')}</small>
      </p>
    )
  }

  return <p style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>{t('workOrders.noTechnicianAssigned')}</p>
}

const WorkOrders = () => {
  const { t, i18n } = useTranslation()
  const { tourCompleted, startTour, skipTour } = useWorkOrdersTour()
  const {
    workOrders,
    pagination,
    loading,
    technicians,
    installations,
    loadingInstallations,
    errorLoadingInstallations,
    loadWorkOrders,
    loadInstallations,
    loadTechnicians,
    addWorkOrder,
    editWorkOrder,
    removeWorkOrder,
    assignTechnician,
    completeWorkOrder,
    startWorkOrder,
  } = useWorkOrders()

  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const userPermissions = useAuthStore((s) => s.permissions)

  const permissions = useMemo(() => {
    if (userPermissions && Object.keys(userPermissions).length > 0) return userPermissions as UserPermissions

    // Fallback basado en roles si faltan permisos del backend
    const isAdmin = role === 'admin' || role === 'super_admin';
    const isTech = role === 'tecnico' || role === 'técnico' || (role && role.toLowerCase() === 'tecnico');

    return {
      canCreateWorkOrders: isAdmin,
      canEditWorkOrders: isAdmin,
      canDeleteWorkOrders: isAdmin,
      canAssignWorkOrders: isAdmin,
      canStartWorkOrder: isTech || isAdmin,
      canCompleteWorkOrder: isTech || isAdmin,
      canViewWorkOrders: true
    };
  }, [userPermissions, role]);

  const isTechnician = role && ["tecnico", "técnico"].includes(role.toLowerCase())

  const [selectedStatus, setSelectedStatus] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedDateFilter, setSelectedDateFilter] = useState("")
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode, isMobile] = useResponsiveView('workorders-view', 'cards')
  const itemsPerPage = 10

  const { timeZone, offset } = useTimeZone()

  useEffect(() => {
    document.title = t("workOrders.titlePage")
  }, [t, i18n.language])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted) {
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour])

  // Cargar catálogos (solo una vez)
  useEffect(() => {
    loadTechnicians()
    loadInstallations()
  }, [])

  const buildFilters = useCallback(() => {
    const filters: any = {
      estado: selectedStatus,
      search: searchTerm,
      prioridad: selectedPriority,
      tecnicoId: selectedTechnician,
      timezone: timeZone,
      offset: offset
    }

    if (selectedDate) {
      const today = new Date()
      let startDate: Date | null = null
      let endDate: Date | null = null

      switch (selectedDate) {
        case "today":
          startDate = today
          endDate = today
          break
        case "thisWeek": {
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          startDate = startOfWeek
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 6)
          endDate = endOfWeek
          break
        }
        case "thisMonth": {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          startDate = startOfMonth
          endDate = endOfMonth
          break
        }
        case "nextWeek": {
          const nextWeekStart = new Date(today)
          nextWeekStart.setDate(today.getDate() - today.getDay() + 7)
          startDate = nextWeekStart
          const nextWeekEnd = new Date(nextWeekStart)
          nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
          endDate = nextWeekEnd
          break
        }
        case "nextMonth": {
          const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          startDate = nextMonthStart
          const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)
          endDate = nextMonthEnd
          break
        }
        case "custom":
          if (selectedDateFilter) {
            startDate = parseDateString(selectedDateFilter)
            endDate = parseDateString(selectedDateFilter) // Assuming single day filter for simplicity as per Calendar implementation
          }
          break
      }

      if (startDate && endDate) {
        filters.startDate = startDate.toISOString().split('T')[0]
        filters.endDate = endDate.toISOString().split('T')[0]
      }
    }

    return filters
  }, [selectedStatus, searchTerm, selectedPriority, selectedTechnician, selectedDate, selectedDateFilter, timeZone, offset])

  useEffect(() => {
    const filters = buildFilters()
    loadWorkOrders(currentPage, itemsPerPage, filters)
  }, [currentPage, buildFilters, loadWorkOrders])

  useEffect(() => {
    const unsubscribe = socketService.onWorkOrdersChanged(() => {
      loadWorkOrders(currentPage, itemsPerPage, buildFilters())
    })

    return unsubscribe
  }, [currentPage, buildFilters, loadWorkOrders])

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
      { label: t('calendar.allPriorities') || 'Todas las prioridades', value: "" },
      { label: t('calendar.low') || 'Baja', value: "baja" },
      { label: t('calendar.medium') || 'Media', value: "media" },
      { label: t('calendar.high') || 'Alta', value: "alta" },
      { label: t('calendar.critical') || 'Crítica', value: "critica" },
    ],
    [t],
  )

  const dateOptions = useMemo(
    () => {
      const opts = [
        { label: t('calendar.allDates') || 'Todas las fechas', value: "" },
        { label: t('calendar.today') || 'Hoy', value: "today" },
        { label: t('calendar.thisWeek') || 'Esta semana', value: "thisWeek" },
        { label: t('calendar.thisMonth') || 'Este mes', value: "thisMonth" },
        { label: t('calendar.nextWeek') || 'Próxima semana', value: "nextWeek" },
        { label: t('calendar.nextMonth') || 'Próximo mes', value: "nextMonth" },
        { label: t('calendar.selectDate') || 'Seleccionar fecha', value: "custom" },
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
    [t, selectedDate, selectedDateFilter, i18n.language],
  )

  const getTechnicianLabel = (tech: any) => {
    const label = t(`technicians.${tech.userName}`, tech.userName)
    return typeof label === 'string' ? label : tech.userName
  }

  const totalPages = pagination.totalPages

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

  const handleOpenCreate = () => {
    setInitialData(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (order: WorkOrder) => {
    setInitialData({ ...order })
    setIsEditModalOpen(true)
  }

  const handleOpenDetails = (order: WorkOrder) => {
    setSelectedWorkOrder(order)
    setIsDetailsModalOpen(true)
  }

  const handleOpenAssign = (order: WorkOrder) => {
    setSelectedWorkOrder(order)
    setIsAssignModalOpen(true)
  }

  const handleOpenComplete = (order: WorkOrder) => {
    setSelectedWorkOrder(order)
    setIsCompleteModalOpen(true)
  }

  const handleViewDetails = (order: WorkOrder) => {
    if (order._id) navigate(`/ordenes-trabajo/${order._id}`)
  }

  const onSuccess = async (msg: string) => {
    setResponseMessage(msg)
    setIsError(false)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsAssignModalOpen(false)
    setIsCompleteModalOpen(false)
    setIsDetailsModalOpen(false)
    loadWorkOrders(currentPage, itemsPerPage, buildFilters())
  }

  const onError = async (msg: string) => {
    setResponseMessage(msg)
    setIsError(true)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsAssignModalOpen(false)
    setIsCompleteModalOpen(false)
    setIsDetailsModalOpen(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleConfirmDelete = async () => {
    if (!workOrderToDelete?._id) return

    try {
      await removeWorkOrder(workOrderToDelete._id)
      onSuccess(t('workOrders.workOrderDeleted'))
    } catch (err: any) {
      onError(err.message || t('workOrders.errorDeletingWorkOrder'))
    } finally {
      setWorkOrderToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleStart = async (id: string) => {
    try {
      await startWorkOrder(id)
      onSuccess(t('workOrders.workOrderStarted'))
    } catch (err: any) {
      onError(err.message || t('workOrders.errorStartingWorkOrder'))
    }
  }

  const shouldShowEditButton = (order: WorkOrder) => {
    const perms = permissions as UserPermissions | null
    if (!perms?.canEditWorkOrders) return false
    return ["pendiente", "asignada"].includes(order.estado)
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleWrappedStart = async (id: string) => {
    // Wrapper for the modal that expects void return but our hook returns object
    await startWorkOrder(id)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedPriority, selectedDate, selectedDateFilter, selectedTechnician])

  return (
    <>
      <div className={styles.containerWorkOrders}>
        <div className={styles.topSection}>
          <div className={styles.headerWithToggle}>
            <h1 className={styles.title}>{t('workOrders.title')}</h1>
            {!isMobile && (
              <ViewToggle 
                view={viewMode} 
                onViewChange={setViewMode}
              />
            )}
          </div>
          {permissions?.canCreateWorkOrders && (
            <div className={styles.positionButton} data-tour="create-work-order-btn">
              <Button title={t('workOrders.createWorkOrder')} onClick={handleOpenCreate}>
                {t('workOrders.createWorkOrder')}
              </Button>
            </div>
          )}
        </div>

        <div className={styles.searchRow} data-tour="search-filter">
          <div className={styles.searchContainer}>
            <SearchInput
              placeholder={t('workOrders.searchPlaceholder')}
              showSelect
              selectPlaceholder={t('workOrders.filterByStatus')}
              selectOptions={statusOptions}
              onInputChange={setSearchTerm}
              onSelectChange={setSelectedStatus}
              value={searchTerm}
              selectValue={selectedStatus}
            />
          </div>
          <button
            onClick={() => {
              setSelectedStatus("")
              setSelectedPriority("")
              setSelectedDate("")
              setSelectedDateFilter("")
              setSearchTerm("")
              setSelectedTechnician("")
            }}
            className={styles.clearFilters}
            title={t('calendar.clearFilters') || 'Limpiar filtros'}
          >
            <FilterX size={20} />
          </button>
        </div>

        <div className={styles.filterContainer}>
          <HybridSelect
            value={selectedTechnician}
            onChange={setSelectedTechnician}
            options={[
              { value: "", label: t('calendar.allTechnicians') || 'Todos los técnicos' },
              ...technicians.map(tech => ({ label: getTechnicianLabel(tech), value: tech._id }))
            ]}
            placeholder={t('calendar.filterByTechnician') || 'Filtrar por técnico'}
            variant="compact"
            className={styles.technicianSelect}
          />

          <HybridSelect
            value={selectedPriority}
            onChange={setSelectedPriority}
            options={priorityOptions}
            placeholder={t('calendar.filterByPriority') || 'Filtrar por prioridad'}
            variant="compact"
            className={styles.prioritySelect}
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
            placeholder={t('calendar.filterByDate') || 'Filtrar por fecha'}
            variant="compact"
            className={styles.dateSelect}
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
              t('calendar.selectDate') || 'Seleccionar fecha'
            )}
          </button>

        </div>



        <div className={styles.listContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.skeletonGrid}>
                {[1, 2, 3].map((_, i) => <Skeleton key={i} height={120} width={"100%"} style={{ borderRadius: 14 }} />)}
              </div>
              <Skeleton height={220} width={"100%"} style={{ borderRadius: 14 }} />

            </div>
          ) : workOrders.length === 0 ? (
            <p className={styles.loader}>{t('workOrders.noWorkOrdersFound')}</p>
          ) : viewMode === 'table' ? (
            <>
              <WorkOrdersTableView
                workOrders={workOrders}
                t={t}
                permissions={permissions}
                onOpenDetails={handleOpenDetails}
                onStart={handleStart}
                onOpenComplete={handleOpenComplete}
                onOpenAssign={handleOpenAssign}
                onOpenEdit={handleOpenEdit}
                onOpenDelete={(order) => {
                  setWorkOrderToDelete(order)
                  setIsDeleteModalOpen(true)
                }}
                getPriorityColor={getPriorityColor}
              />
              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                  {"<"}
                </button>
                <span>
                  {t('workOrders.page')} {currentPage} {t('workOrders.of')} {totalPages}
                </span>
                <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
                  {">"}
                </button>
              </div>
            </>
          ) : (
            <>
              {workOrders.map((order) => (
                <div key={order._id} className={styles.workOrderCard}>
                  <div className={styles.workOrderInfo}>
                    <div className={styles.workOrderHeader}>
                      <h3 className={styles.workOrderTitle}>{order.titulo}</h3>
                      <span
                        className={styles.priorityBadge}
                        style={{ backgroundColor: getPriorityColor(order.prioridad), color: '#000', fontWeight: 700 }}
                      >
                        {translatePriority(order.prioridad)}
                      </span>
                    </div>

                    <p className={styles.workOrderDescription}>{order.descripcion}</p>

                    <div className={styles.workOrderDetails}>
                      <p>
                        <strong>{t('workOrders.type')}:</strong> {translateWorkType(order.tipoTrabajo)}
                      </p>
                      <p>
                        <strong>{t('workOrders.orderType')}:</strong> {translateOrderType(order.tipoOrden || "correctivo")}
                      </p>
                      <p>
                        <strong>{t('workOrders.origin')}:</strong> {translateOrderOrigin(order.origen || "manual")}
                      </p>
                      <div className={styles.statusRow}>
                        <strong>{t('workOrders.status')}:</strong>
                        <span className={`${styles.statusBadge} ${styles[order.estado]}`}>
                          {translateWorkOrderStatus(order.estado)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                        <Clock size={16} />
                        <span>
                          <strong>{t('calendar.scheduledDate') || 'Fecha programada'}: </strong>
                          {new Date(order.fechaProgramada).toLocaleDateString()} {t('workOrders.at')} {order.horaProgramada}
                        </span>
                      </div>

                      {order.instalacion && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                          <MapPin size={16} style={{ marginTop: '3px', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                              {order.instalacion.company}
                            </span>
                            <span style={{ fontSize: '0.9em' }}>
                              {order.instalacion.address}
                            </span>
                          </div>
                        </div>
                      )}
                      {renderTechnicianInfo(order, t)}
                    </div>
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    <div className={styles.actionButtons}>
                      <Tooltip content={t('workOrders.tooltips.viewDetails') || 'Ver detalles'}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenDetails(order)}
                          aria-label={t('workOrders.tooltips.viewDetails') || 'Ver detalles'}
                        >
                          <Eye size={20} />
                        </button>
                      </Tooltip>
                      {order.estado === "asignada" && permissions?.canStartWorkOrder && (
                        <Tooltip content={t('workOrders.startOrder')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleStart(order._id!)}
                            aria-label={t('workOrders.startOrder')}
                          >
                            <Play size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {order.estado === "en_progreso" && permissions?.canCompleteWorkOrder && (
                        <Tooltip content={t('workOrders.completeOrder')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenComplete(order)}
                            aria-label={t('workOrders.completeOrder')}
                          >
                            <Check size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {permissions?.canAssignWorkOrders && ["pendiente", "asignada"].includes(order.estado) && (
                        <Tooltip content={t('workOrders.assignTechnician')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenAssign(order)}
                            aria-label={t('workOrders.assignTechnician')}
                          >
                            <User size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {permissions?.canEditWorkOrders && shouldShowEditButton(order) && (
                        <Tooltip content={t('workOrders.editOrder')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenEdit(order)}
                            aria-label={t('workOrders.editOrder')}
                          >
                            <Edit size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {permissions?.canDeleteWorkOrders && (
                        <Tooltip content={t('workOrders.deleteOrder')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => {
                              setWorkOrderToDelete(order)
                              setIsDeleteModalOpen(true)
                            }}
                            aria-label={t('workOrders.deleteOrder')}
                          >
                            <Trash size={20} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                  {"<"}
                </button>
                <span>
                  {t('workOrders.page')} {currentPage} {t('workOrders.of')} {totalPages}
                </span>
                <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
                  {">"}
                </button>
              </div>
            </>
          )}
        </div>
      </div >

      <ModalCreate
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={onSuccess}
        onSubmitError={onError}
        onAdd={addWorkOrder}
        installations={installations}
        technicians={technicians}
        loadingInstallations={loadingInstallations}
        errorLoadingInstallations={errorLoadingInstallations}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={onSuccess}
        onEdit={editWorkOrder}
        initialData={initialData}
        installations={installations}
        technicians={technicians}
        loadingInstallations={loadingInstallations}
        errorLoadingInstallations={errorLoadingInstallations}
      />

      <ModalAssignTechnician
        isOpen={isAssignModalOpen}
        onRequestClose={() => setIsAssignModalOpen(false)}
        onSubmitSuccess={onSuccess}
        onAssign={assignTechnician}
        workOrder={selectedWorkOrder}
        technicians={technicians}
      />

      <ModalCompleteWorkOrder
        isOpen={isCompleteModalOpen}
        onRequestClose={() => setIsCompleteModalOpen(false)}
        onSubmitSuccess={onSuccess}
        onComplete={completeWorkOrder}
        workOrder={selectedWorkOrder}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('workOrders.confirmDeleteWorkOrder')}
        description={t('workOrders.confirmDeleteWorkOrderDescription')}
      />

      <ModalWorkOrderDetails
        isOpen={isDetailsModalOpen}
        onRequestClose={() => setIsDetailsModalOpen(false)}
        workOrder={selectedWorkOrder}
        onStart={permissions?.canStartWorkOrder ? handleWrappedStart : undefined}
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

      {/* Botón flotante del tour estilo WhatsApp */}
      <TourButton
        onClick={tourCompleted ? startTour : skipTour}
        label={tourCompleted ? t('workOrders.tour.buttons.restart') : t('workOrders.tour.buttons.skip')}
      />
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onRequestClose={() => setIsDatePickerOpen(false)}
        onDateSelect={(date) => {
          setSelectedDateFilter(date)
          setSelectedDate("custom")
        }}
        selectedDate={selectedDateFilter}
        title={t('calendar.selectDate') || 'Seleccionar fecha'}
      />
    </>
  )
}

export default WorkOrders
