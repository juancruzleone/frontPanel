import { useEffect, useMemo, useState } from "react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import styles from "../features/subscriptions/styles/subscriptions.module.css"
import useSubscriptions, { type Subscription } from "../features/subscriptions/hooks/useSubscriptions"
import ModalEditFrequency from "../features/subscriptions/components/ModalEditFrequency"
import ModalSuccess from '../features/forms/components/ModalSuccess'
import ModalError from '../features/forms/components/ModalError'
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { Edit } from "lucide-react"
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const Subscriptions = () => {
  const { t, i18n } = useTranslation()
  const { subscriptions, frequencyOptions, getMonthsByFrequency, loading, error, refreshSubscriptions, updateSubscription } = useSubscriptions()
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()

  // Redirigir a la página anterior si es técnico
  useEffect(() => {
    if (role && ["tecnico", "técnico"].includes(role.toLowerCase())) {
      navigate(-1)
    }
  }, [role, navigate])

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditFrequencyModalOpen, setIsEditFrequencyModalOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const itemsPerPage = 5

  useEffect(() => {
    document.title = t("subscriptions.titlePage")
  }, [t, i18n.language])

  // Filtrar suscripciones por término de búsqueda
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

      return fieldsToSearch.some(
        field => field.toLowerCase().includes(searchTermLower)
      )
    })
  }, [subscriptions, searchTerm])

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

  const handleSaveFrequency = async (subscriptionId: string, frequency: string, startDate?: string, endDate?: string, status?: 'active' | 'inactive' | 'pending') => {
    await updateSubscription(subscriptionId, {
      frequency,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    })
    return { message: t('subscriptions.frequencyUpdated') }
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

      <div className={styles.searchContainer}>
        <SearchInput
          placeholder={t('subscriptions.searchPlaceholder')}
          onInputChange={(value) => setSearchTerm(value)}
        />
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
                          {subscription.frequency}
                        </span>
                        <button
                          className={styles.editFrequencyButton}
                          onClick={() => handleEditFrequency(subscription)}
                          aria-label={t('subscriptions.editFrequency')}
                          title={t('subscriptions.editFrequency')}
                          type="button"
                          data-tooltip={t('subscriptions.editFrequency')}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, marginLeft: 8, cursor: 'pointer', position: 'relative' }}
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.monthsContainer}>
                        {subscription.months.map((month, index) => (
                          <span key={index} className={styles.monthTag}>
                            {month}
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
    </div>
  )
}

export default Subscriptions 