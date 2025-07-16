import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../shared/components/Buttons/buttonCreate"
import SearchInput from "../shared/components/Inputs/SearchInput"
import styles from "../features/workOrders/styles/workOrders.module.css"
import useWorkOrders, { type WorkOrder } from "../features/workOrders/hooks/useWorkOrders"
import ModalCreate from "../features/workOrders/components/ModalCreate"
import ModalEdit from "../features/workOrders/components/ModalEdit"
import ModalSuccess from "../features/workOrders/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalConfirmDelete from "../features/workOrders/components/ModalConfirmDelete"
import ModalAssignTechnician from "../features/workOrders/components/ModalAssignTechnician"
import ModalCompleteWorkOrder from "../features/workOrders/components/ModalCompleteWorkOrder"
import { Edit, Trash, User, Check, Play } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { translateWorkOrderStatus, translatePriority, translateWorkType } from "../shared/utils/backendTranslations"

const renderTechnicianInfo = (order: WorkOrder, t: (key: string) => string) => {
  if (order.tecnico && (order.tecnico as any).userName) {
    return (
      <p>
        <strong>{t('workOrders.technician')}:</strong> {(order.tecnico as any).userName}
        {order.estado === "asignada" && (
          <span style={{ marginLeft: "8px", color: "#4CAF50", fontSize: "0.8em" }}>({t('workOrders.pendingStart')})</span>
        )}
        {order.estado === "en_progreso" && (
          <span style={{ marginLeft: "8px", color: "#2196F3", fontSize: "0.8em" }}>({t('workOrders.inProgress')})</span>
        )}
      </p>
    )
  }

  if (order.tecnicoAsignado) {
    return (
      <p style={{ color: "orange" }}>
        <strong>{t('workOrders.assignedTechnician')}:</strong> ID {order.tecnicoAsignado}
        <br />
        <small>{t('workOrders.loadingTechnicianDetails')}</small>
      </p>
    )
  }

  return <p style={{ color: "#666", fontStyle: "italic" }}>{t('workOrders.noTechnicianAssigned')}</p>
}

const WorkOrders = () => {
  const { t, i18n } = useTranslation()
  const {
    workOrders,
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

  const [selectedStatus, setSelectedStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<WorkOrder | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(null)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    document.title = t("workOrders.titlePage")
  }, [t, i18n.language])

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadTechnicians(),
          loadInstallations(),
          loadWorkOrders()
        ])
      } catch (err) {
        console.error("Error loading data:", err)
      }
    }
    loadData()
  }, [loadTechnicians, loadInstallations, loadWorkOrders])

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
        order.prioridad,
        order.tipoTrabajo,
      ].filter(Boolean)

      const matchesStatus = !selectedStatus || order.estado === selectedStatus
      const matchesSearch = fields.some((f) => f?.toLowerCase().includes(term))

      return matchesStatus && matchesSearch
    })
  }, [workOrders, selectedStatus, searchTerm])

  const totalPages = Math.ceil(filteredWorkOrders.length / itemsPerPage)
  const paginatedWorkOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredWorkOrders.slice(start, start + itemsPerPage)
  }, [filteredWorkOrders, currentPage])

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
    await loadWorkOrders()
  }

  const onError = async (msg: string) => {
    setResponseMessage(msg)
    setIsError(true)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsAssignModalOpen(false)
    setIsCompleteModalOpen(false)
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
    return ["pendiente", "asignada"].includes(order.estado)
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus])

  return (
    <>
      <div className={styles.containerWorkOrders}>
        <h1 className={styles.title}>{t('workOrders.title')}</h1>
        <div className={styles.positionButton}>
          <Button title={t('workOrders.createWorkOrder')} onClick={handleOpenCreate}>
            {t('workOrders.createWorkOrder')}
          </Button>
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder={t('workOrders.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('workOrders.filterByStatus')}
            selectOptions={statusOptions}
            onInputChange={setSearchTerm}
            onSelectChange={setSelectedStatus}
          />
        </div>

        <div className={styles.listContainer}>
          {loading ? (
            <>
              <div className={styles.cardsRow}>
                {[1,2,3].map((_,i) => <Skeleton key={i} height={120} width={"100%"} style={{borderRadius:14, marginBottom:16}} />)}
              </div>
              <Skeleton height={220} width={"100%"} style={{borderRadius:14, marginTop:16}} />
            </>
          ) : filteredWorkOrders.length === 0 ? (
            <p className={styles.loader}>{t('workOrders.noWorkOrdersFound')}</p>
          ) : (
            <>
              {paginatedWorkOrders.map((order) => (
                <div key={order._id} className={styles.workOrderCard}>
                  <div className={styles.workOrderInfo}>
                    <div className={styles.workOrderHeader}>
                      <h3 className={styles.workOrderTitle}>{order.titulo}</h3>
                      <span
                        className={styles.priorityBadge}
                        style={{ backgroundColor: getPriorityColor(order.prioridad) }}
                      >
                        {order.prioridad.toUpperCase()}
                      </span>
                    </div>

                    <p className={styles.workOrderDescription}>{order.descripcion}</p>

                    <div className={styles.workOrderDetails}>
                      <p>
                        <strong>{t('workOrders.type')}:</strong> {translateWorkType(order.tipoTrabajo)}
                      </p>
                      <p>
                        <strong>{t('workOrders.status')}:</strong>{" "}
                        <span className={`${styles.statusBadge} ${styles[order.estado]}`}>
                          {translateWorkOrderStatus(order.estado)}
                        </span>
                      </p>
                      <p>
                        <strong>{t('workOrders.scheduled')}:</strong> {new Date(order.fechaProgramada).toLocaleDateString()} {t('workOrders.at')} {order.horaProgramada}
                      </p>
                      {order.instalacion && (
                        <p>
                          <strong>{t('workOrders.installation')}:</strong> {order.instalacion.company} - {order.instalacion.address}
                        </p>
                      )}
                      {renderTechnicianInfo(order, t)}
                    </div>
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    <div className={styles.actionButtons}>
                      {order.estado === "asignada" && (
                        <button
                          className={styles.iconButton}
                          onClick={() => handleStart(order._id!)}
                          aria-label={t('workOrders.startOrder')}
                          data-tooltip={t('workOrders.startOrder')}
                        >
                          <Play size={20} />
                        </button>
                      )}
                      {order.estado === "en_progreso" && (
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenComplete(order)}
                          aria-label={t('workOrders.completeOrder')}
                          data-tooltip={t('workOrders.completeOrder')}
                        >
                          <Check size={20} />
                        </button>
                      )}
                      {order.estado === "pendiente" && (
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenAssign(order)}
                          aria-label={t('workOrders.assignTechnician')}
                          data-tooltip={t('workOrders.assignTechnician')}
                        >
                          <User size={20} />
                        </button>
                      )}
                      {shouldShowEditButton(order) && (
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenEdit(order)}
                          aria-label={t('workOrders.editOrder')}
                          data-tooltip={t('workOrders.editOrder')}
                        >
                          <Edit size={20} />
                        </button>
                      )}
                      <button
                        className={styles.iconButton}
                        onClick={() => {
                          setWorkOrderToDelete(order)
                          setIsDeleteModalOpen(true)
                        }}
                        aria-label={t('workOrders.deleteOrder')}
                        data-tooltip={t('workOrders.deleteOrder')}
                      >
                        <Trash size={20} />
                      </button>
                    </div>

                    <div className={styles.viewDetailsButton}>
                      <button onClick={() => handleViewDetails(order)}>{t('workOrders.viewCompleteDetails')}</button>
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
      </div>

      <ModalCreate
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={onSuccess}
        onSubmitError={onError}
        onAdd={addWorkOrder}
        installations={installations}
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

export default WorkOrders
