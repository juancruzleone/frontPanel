import React, { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Edit, FilterX, HelpCircle } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import { useTheme } from "../shared/hooks/useTheme"
import SearchInput from "../shared/components/Inputs/SearchInput"
import HybridSelect from "../shared/components/HybridSelect"
import ModalEditFrequency from "../features/subscriptions/components/ModalEditFrequency"
import ModalSuccess from "../features/subscriptions/components/ModalSuccess"
import ModalError from "../features/subscriptions/components/ModalError"
import Skeleton from "../shared/components/Skeleton"
import { useSubscriptions } from "../features/subscriptions/hooks/useSubscriptions"
import type { Subscription } from "../features/subscriptions/hooks/useSubscriptions"
import { translateMonthToCurrentLang, translateFrequencyToCurrentLang } from "../shared/utils/backendTranslations"
import styles from "../features/subscriptions/styles/subscriptions.module.css"
import { useSubscriptionsTour } from "../features/subscriptions/hooks/useSubscriptionsTour"

const Subscriptions = () => {
  const { t, i18n } = useTranslation()
  const { dark } = useTheme()
  const { subscriptions, frequencyOptions, getMonthsByFrequency, loading, error, refreshSubscriptions, updateSubscription } = useSubscriptions()
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

  // Opciones para el filtro de meses
  const monthOptions = useMemo(() => [
    { label: t('common.all'), value: "" },
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
  ], [t, i18n.language])

  // Filtrar suscripciones por término de búsqueda y mes
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
        ...subscription.months
      ]

      const matchesSearch = fieldsToSearch.some(
        field => field.toLowerCase().includes(searchTermLower)
      )

      // Filtro por mes
      const matchesMonth = !selectedMonthFilter || subscription.months.includes(selectedMonthFilter)

      return matchesSearch && matchesMonth
    })
  }, [subscriptions, searchTerm, selectedMonthFilter])

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
        status,
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
      <div>
        <h1 className={styles.title}>{t('subscriptions.title')}</h1>
        <p className={styles.subtitle}>{t('subscriptions.subtitle')}</p>
      </div>

      <div className={styles.filtersContainer} data-tour="search-filter-subscriptions">
        <div className={styles.searchContainer}>
          <SearchInput
            placeholder={t('subscriptions.searchPlaceholder')}
            onInputChange={(value) => setSearchTerm(value)}
          />
        </div>

        <div className={styles.additionalFilters}>
          <HybridSelect
            value={selectedMonthFilter}
            onChange={setSelectedMonthFilter}
            options={monthOptions}
            placeholder={t('subscriptions.filterByMonth')}
            autoSize={true}
          />

          <button
            onClick={() => {
              setSearchTerm("")
              setSelectedMonthFilter("")
              setCurrentPage(1)
            }}
            className={styles.clearFilters}
          >
            <FilterX size={16} />
            {t('calendar.clearFilters')}
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loader}>
            <Skeleton height={400} width="100%" style={{ borderRadius: 16 }} />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <p className={styles.emptyMessage}>
            {searchTerm.trim() ? t('subscriptions.noSubscriptionsFound') : t('subscriptions.noSubscriptions')}
          </p>
        ) : (
          <>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th>{t('subscriptions.table.installation')}</th>
                  <th>{t('subscriptions.table.address')}</th>
                  <th>{t('subscriptions.table.type')}</th>
                  <th>{t('subscriptions.table.frequency')}</th>
                  <th>{t('subscriptions.table.months')}</th>
                  <th>{t('subscriptions.table.status')}</th>
                  <th>{t('subscriptions.table.startDate')}</th>
                  <th>{t('subscriptions.table.endDate')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubscriptions.map((subscription) => (
                  <tr key={subscription._id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div className={styles.installationName}>
                        {subscription.installationName}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.address}>
                        {subscription.address}, {subscription.city}, {subscription.province}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={styles.installationType}>
                        {subscription.installationType}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.frequencyCell}>
                        <span className={styles.frequency}>
                          {translateFrequencyToCurrentLang(subscription.frequency, i18n.language)}
                        </span>
                        <button
                          className={styles.editFrequencyButton}
                          onClick={() => handleEditFrequency(subscription)}
                          aria-label={t('subscriptions.editFrequency')}
                          title={t('subscriptions.editFrequency')}
                          type="button"
                          data-tooltip={t('subscriptions.editFrequency')}
                          data-tour="edit-frequency-btn"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.monthsContainer} data-tour="months-display">
                        {subscription.months.map((month, index) => (
                          <span key={index} className={styles.monthTag}>
                            {translateMonthToCurrentLang(month, i18n.language)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.status} ${styles[subscription.status]}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      {subscription.startDate instanceof Date && !isNaN(subscription.startDate.getTime()) ?
                        subscription.startDate.toLocaleDateString(i18n.language || 'es', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </td>
                    <td className={styles.tableCell}>
                      {subscription.endDate instanceof Date && !isNaN(subscription.endDate.getTime()) ?
                        subscription.endDate.toLocaleDateString(i18n.language || 'es', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      {!isTechnician && (
        <button
          onClick={tourCompleted ? startTour : skipTour}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-secondary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5, 126, 116, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1000,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 126, 116, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 126, 116, 0.3)'
          }}
          title={tourCompleted ? t('subscriptions.tour.buttons.restart') : t('subscriptions.tour.buttons.skip')}
        >
          <HelpCircle size={28} />
        </button>
      )}
    </div>
  )
}

export default Subscriptions