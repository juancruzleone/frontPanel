import React, { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Edit, FilterX, HelpCircle, Eye, FileUp, FileText } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import { useTheme } from "../shared/hooks/useTheme"
import SearchInput from "../shared/components/Inputs/SearchInput"
import HybridSelect from "../shared/components/HybridSelect"
import ModalEditFrequency from "../features/subscriptions/components/ModalEditFrequency"
import ModalSuccess from "../features/subscriptions/components/ModalSuccess"
import ModalError from "../features/subscriptions/components/ModalError"
import MonthsDisplayModal from "../features/subscriptions/components/MonthsDisplayModal"
import ModalUploadDocument from "../features/subscriptions/components/ModalUploadDocument"
import ModalViewDocuments from "../features/subscriptions/components/ModalViewDocuments"
import Skeleton from "../shared/components/Skeleton"
import { useSubscriptions } from "../features/subscriptions/hooks/useSubscriptions"
import type { Subscription } from "../features/subscriptions/hooks/useSubscriptions"
import { translateMonthToCurrentLang, translateFrequencyToCurrentLang } from "../shared/utils/backendTranslations"
import styles from "../features/subscriptions/styles/subscriptions.module.css"
import { useSubscriptionsTour } from "../features/subscriptions/hooks/useSubscriptionsTour"
import TourButton from "../shared/components/Buttons/TourButton"

const Subscriptions = () => {
  const { t, i18n } = useTranslation()
  const { dark } = useTheme()
  const { subscriptions, frequencyOptions, loading, error, refreshSubscriptions, updateSubscription, getMonthsByFrequency } = useSubscriptions()
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()
  const isTechnician = role && ["tecnico", "técnico"].includes(role.toLowerCase())
  const { tourCompleted, startTour, skipTour } = useSubscriptionsTour()

  // Redirigir a la página anterior si es técnico
  useEffect(() => {
    if (role && ["tecnico", "técnico"].includes(role.toLowerCase())) {
      navigate(-1)
    }
  }, [role, navigate])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditFrequencyModalOpen, setIsEditFrequencyModalOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isMonthsModalOpen, setIsMonthsModalOpen] = useState(false)
  const [selectedSubscriptionForMonths, setSelectedSubscriptionForMonths] = useState<Subscription | null>(null)
  const [isUploadDocumentModalOpen, setIsUploadDocumentModalOpen] = useState(false)
  const [selectedSubscriptionForUpload, setSelectedSubscriptionForUpload] = useState<Subscription | null>(null)
  const [isViewDocumentsModalOpen, setIsViewDocumentsModalOpen] = useState(false)
  const [selectedSubscriptionForViewDocs, setSelectedSubscriptionForViewDocs] = useState<Subscription | null>(null)
  const itemsPerPage = 5

  useEffect(() => {
    document.title = t("subscriptions.titlePage")
  }, [t, i18n.language])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted && !isTechnician) {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour, isTechnician])

  // Opciones para el filtro de meses (sin la opción "Todas")
  const monthOptions = useMemo(() => [
    { label: translateMonthToCurrentLang('Enero', i18n.language), value: "Enero" },
    { label: translateMonthToCurrentLang('Febrero', i18n.language), value: "Febrero" },
    { label: translateMonthToCurrentLang('Marzo', i18n.language), value: "Marzo" },
    { label: translateMonthToCurrentLang('Abril', i18n.language), value: "Abril" },
    { label: translateMonthToCurrentLang('Mayo', i18n.language), value: "Mayo" },
    { label: translateMonthToCurrentLang('Junio', i18n.language), value: "Junio" },
    { label: translateMonthToCurrentLang('Julio', i18n.language), value: "Julio" },
    { label: translateMonthToCurrentLang('Agosto', i18n.language), value: "Agosto" },
    { label: translateMonthToCurrentLang('Septiembre', i18n.language), value: "Septiembre" },
    { label: translateMonthToCurrentLang('Octubre', i18n.language), value: "Octubre" },
    { label: translateMonthToCurrentLang('Noviembre', i18n.language), value: "Noviembre" },
    { label: translateMonthToCurrentLang('Diciembre', i18n.language), value: "Diciembre" },
  ], [i18n.language])

  const [selectedStatus, setSelectedStatus] = useState<string>("")

  // Filtrar suscripciones por término de búsqueda, mes y estado
  const filteredSubscriptions = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase()

    return subscriptions.filter((subscription) => {
      if (!subscription) return false

      const fieldsToSearch = [
        subscription.installationName || '',
        subscription.address || '',
        subscription.city || '',
        subscription.province || '',
        subscription.installationType || '',
        subscription.frequency || '',
      ]

      const matchesSearch = fieldsToSearch.some(
        field => field.toLowerCase().includes(searchTermLower)
      )

      // Filtro por mes
      const matchesMonth = !selectedMonthFilter || subscription.months.includes(selectedMonthFilter)

      // Filtro por estado (si no hay filtro seleccionado, mostrar todas)
      const matchesStatus = !selectedStatus || subscription.status === selectedStatus

      return matchesSearch && matchesMonth && matchesStatus
    })
  }, [subscriptions, searchTerm, selectedMonthFilter, selectedStatus])

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage)
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredSubscriptions.slice(start, start + itemsPerPage)
  }, [filteredSubscriptions, currentPage])

  // Resetear página cuando cambie el término de búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleChangePage = (page: number) => {
    setCurrentPage(page)
  }

  const handleEditFrequency = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setIsEditFrequencyModalOpen(true)
  }

  const handleViewMonths = (subscription: Subscription) => {
    setSelectedSubscriptionForMonths(subscription)
    setIsMonthsModalOpen(true)
  }

  const handleUploadDocument = (subscription: Subscription) => {
    setSelectedSubscriptionForUpload(subscription)
    setIsUploadDocumentModalOpen(true)
  }

  const handleViewDocuments = (subscription: Subscription) => {
    setSelectedSubscriptionForViewDocs(subscription)
    setIsViewDocumentsModalOpen(true)
  }

  const handleUploadSuccess = (message: string) => {
    setIsUploadDocumentModalOpen(false)
    setSelectedSubscriptionForUpload(null)
    setResponseMessage(message)
    setIsError(false)
  }

  const handleUploadError = (message: string) => {
    setResponseMessage(message)
    setIsError(true)
  }

  const handleSaveFrequency = async (
    subscriptionId: string,
    frequency: string,
    startDate?: string,
    endDate?: string,
    status?: 'active' | 'inactive' | 'pending',
    months?: string[]
  ) => {
    try {
      // Convertir fechas string a Date sin problema de zona horaria
      const parseDateString = (dateStr?: string): Date | undefined => {
        if (!dateStr) return undefined
        // Si está en formato YYYY-MM-DD, parsear sin conversión de zona horaria
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
      }

      await updateSubscription(subscriptionId, {
        frequency,
        startDate: parseDateString(startDate),
        endDate: parseDateString(endDate),
        status: status || 'active',
        months: months || [],
      })
      return { message: t('subscriptions.frequencyUpdated') }
    } catch (error: any) {
      // Propagar el error para que sea manejado por el modal
      throw error
    }
  }

  const handleSuccessEditFrequency = (message: string) => {
    setIsEditFrequencyModalOpen(false)
    setSelectedSubscription(null)
    setResponseMessage(message)
    setIsError(false)
    refreshSubscriptions()
  }

  const handleErrorEditFrequency = (message: string) => {
    setResponseMessage(message)
    setIsError(true)
  }

  const closeModal = () => {
    setIsEditFrequencyModalOpen(false)
    setSelectedSubscription(null)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('subscriptions.status.active')
      case 'inactive':
        return t('subscriptions.status.inactive')
      case 'pending':
        return t('subscriptions.status.pending')
      default:
        return status
    }
  }

  if (error) {
    return (
      <div className={styles.containerSubscriptions}>
        <h1 className={styles.title}>{t('subscriptions.title')}</h1>
        <p className={styles.error}>{error}</p>
        <button onClick={refreshSubscriptions} className={styles.retryButton}>
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.containerSubscriptions}>
      <div className={styles.topSection}>
        <h1 className={styles.title}>{t('subscriptions.title')}</h1>
      </div>

      <div className={styles.mainControls}>
        <div className={styles.tabsContainer}>
          {[
            { id: '', label: t('common.all') },
            { id: 'active', label: t('subscriptions.status.active') },
            { id: 'pending', label: t('subscriptions.status.pending') },
            { id: 'inactive', label: t('subscriptions.status.inactive') }
          ].map(tab => (
            <button
              key={tab.id || 'all'}
              className={`${styles.tab} ${selectedStatus === tab.id ? styles.activeTab : ''}`}
              onClick={() => setSelectedStatus(tab.id)}
            >
              {tab.label}
              <span className={styles.tabBadge}>
                {tab.id === ''
                  ? subscriptions.length
                  : subscriptions.filter(s => s.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.filtersWrapper}>
          <div className={styles.searchRow}>
            <div className={styles.filterActions}>
              <HybridSelect
                value={selectedMonthFilter}
                onChange={setSelectedMonthFilter}
                options={monthOptions}
                placeholder={t('subscriptions.filterByMonth')}
                variant="compact"
              />
            </div>

            <div className={styles.searchContainerInner}>
              <SearchInput
                placeholder={t('subscriptions.searchPlaceholder')}
                onInputChange={(value) => setSearchTerm(value)}
                value={searchTerm}
              />
            </div>
            <button
              onClick={() => {
                setSearchTerm("")
                setSelectedMonthFilter("")
                setSelectedStatus("")
                setCurrentPage(1)
              }}
              className={styles.clearFilters}
              title={t('calendar.clearFilters')}
            >
              <FilterX size={18} />
            </button>
          </div>

          <div className={styles.statusSelectContainer}>
            <HybridSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: 'active', label: t('subscriptions.status.active') },
                { value: 'pending', label: t('subscriptions.status.pending') },
                { value: 'inactive', label: t('subscriptions.status.inactive') }
              ]}
              placeholder={t('subscriptions.filterByStatus')}
              variant="compact"
              className={styles.fullWidthSelect}
            />
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Skeleton height={400} width="100%" style={{ borderRadius: 16 }} />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FilterX size={48} />
            </div>
            <p className={styles.emptyMessage}>
              {searchTerm.trim() ? t('subscriptions.noSubscriptionsFound') : t('subscriptions.noSubscriptions')}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th style={{ textAlign: 'left' }}>{t('subscriptions.table.installation')}</th>
                    <th>{t('subscriptions.table.type')}</th>
                    <th style={{ textAlign: 'left' }}>{t('subscriptions.table.frequency')}</th>
                    <th>{t('subscriptions.table.status')}</th>
                    <th>{t('subscriptions.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubscriptions.map((subscription) => (
                    <tr key={subscription._id} className={styles.tableRow}>
                      <td className={styles.tableCell} style={{ textAlign: 'left' }} data-label={t('subscriptions.table.installation')}>
                        <div className={styles.installationCell}>
                          <div className={styles.installationName}>{subscription.installationName}</div>
                          <div className={styles.installationAddress}>
                            {subscription.address}, {subscription.city}
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell} data-label={t('subscriptions.table.type')}>
                        <div className={styles.typeBadge}>
                          {subscription.installationType}
                        </div>
                      </td>
                      <td className={styles.tableCell} style={{ textAlign: 'left' }} data-label={t('subscriptions.table.frequency')}>
                        <div className={styles.frequencyGroup} style={{ justifyContent: 'flex-start' }}>
                          <span className={styles.frequencyText}>
                            {translateFrequencyToCurrentLang(subscription.frequency, i18n.language)}
                          </span>
                          <button
                            className={styles.actionIcon}
                            onClick={() => handleEditFrequency(subscription)}
                            title={t('subscriptions.editFrequency')}
                            data-tooltip={t('subscriptions.editFrequency')}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                      <td className={styles.tableCell} data-label={t('subscriptions.table.status')}>
                        <span className={`${styles.statusPill} ${styles[subscription.status]}`}>
                          {getStatusText(subscription.status)}
                        </span>
                      </td>
                      <td className={styles.tableCell} data-label={t('subscriptions.table.actions')}>
                        <div className={styles.actionsGroup}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleViewMonths(subscription)}
                            title={t('common.details')}
                            data-tooltip={t('common.details')}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleViewDocuments(subscription)}
                            title={t('subscriptions.documents.viewTooltip') || 'Ver documentos'}
                            data-tooltip={t('subscriptions.documents.viewTooltip') || 'Ver documentos'}
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleUploadDocument(subscription)}
                            title={t('subscriptions.documents.uploadTooltip')}
                            data-tooltip={t('subscriptions.documents.uploadTooltip')}
                          >
                            <FileUp size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => handleChangePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </button>

                <span>
                  {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                </span>

                <button
                  onClick={() => handleChangePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ModalEditFrequency
        isOpen={isEditFrequencyModalOpen}
        onRequestClose={closeModal}
        subscription={selectedSubscription}
        frequencyOptions={frequencyOptions}
        getMonthsByFrequency={getMonthsByFrequency}
        onSave={handleSaveFrequency}
        onSubmitSuccess={handleSuccessEditFrequency}
        onSubmitError={handleErrorEditFrequency}
      />
      <MonthsDisplayModal
        isOpen={isMonthsModalOpen}
        onRequestClose={() => setIsMonthsModalOpen(false)}
        installationName={selectedSubscriptionForMonths?.installationName || ''}
        startDate={selectedSubscriptionForMonths?.startDate}
        endDate={selectedSubscriptionForMonths?.endDate}
        frequency={selectedSubscriptionForMonths?.frequency || ''}
        selectedMonths={selectedSubscriptionForMonths?.months || []}
      />
      <ModalUploadDocument
        isOpen={isUploadDocumentModalOpen}
        onRequestClose={() => {
          setIsUploadDocumentModalOpen(false)
          setSelectedSubscriptionForUpload(null)
        }}
        installationId={selectedSubscriptionForUpload?.installationId || ''}
        installationName={selectedSubscriptionForUpload?.installationName || ''}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
      <ModalViewDocuments
        isOpen={isViewDocumentsModalOpen}
        onRequestClose={() => {
          setIsViewDocumentsModalOpen(false)
          setSelectedSubscriptionForViewDocs(null)
        }}
        installationId={selectedSubscriptionForViewDocs?.installationId || ''}
        installationName={selectedSubscriptionForViewDocs?.installationName || ''}
        onError={handleUploadError}
        onSuccess={(message) => {
          setResponseMessage(message)
          setIsError(false)
        }}
      />
      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      {!isTechnician && (
        <TourButton
          onClick={tourCompleted ? startTour : skipTour}
          label={tourCompleted ? t('subscriptions.tour.buttons.restart') : t('subscriptions.tour.buttons.skip')}
        />
      )}
    </div>
  )
}

export default Subscriptions