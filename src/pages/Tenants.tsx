import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/tenants/styles/tenants.module.css"
import useTenants from "../features/tenants/hooks/useTenants"
import { Tenant } from "../features/tenants/types/tenant.types"
import { Edit, Trash, Plus, Building, Users, Calendar } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../store/authStore"
import ModalCreate from "../features/tenants/components/ModalCreate.tsx"
import ModalEdit from "../features/tenants/components/ModalEdit.tsx"
import ModalConfirmDelete from "../features/tenants/components/ModalConfirmDelete.tsx"
import ModalSuccess from "../features/tenants/components/ModalSuccess.tsx"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"
import DataTable from "../components/DataTable/DataTable"
import Tooltip from "../shared/components/Tooltip/Tooltip"

const Tenants = () => {
  const { t, i18n } = useTranslation()
  const {
    tenants,
    loading,
    error,
    loadTenants,
    addTenant,
    editTenant,
    removeTenant,
  } = useTenants()

  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'super_admin'

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode, isMobile] = useResponsiveView('tenants-view', 'cards')
  const itemsPerPage = 4

  // Estados para los modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    document.title = t("tenants.titlePage")
    loadTenants()
  }, [t, i18n.language, loadTenants])

  const filteredTenants = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase()
    return tenants.filter((tenant) => {
      if (!tenant) return false

      const fieldsToSearch = [
        tenant.name || "",
        tenant.subdomain || "",
        tenant.email || "",
        tenant.status || "",
        tenant.plan || "",
        tenant.createdAt || "",
      ]

      const matchesSearch = fieldsToSearch.some((field) => 
        field.toLowerCase().includes(searchTermLower)
      )

      return matchesSearch
    })
  }, [tenants, searchTerm])

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage)
  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTenants.slice(start, start + itemsPerPage)
  }, [filteredTenants, currentPage])

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'activo':
        return '#10b981'
      case 'suspended':
      case 'suspendido':
        return '#f59e0b'
      case 'cancelled':
      case 'cancelado':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const translatePlan = (plan: string | null) => {
    if (!plan) return t('tenants.noPlan') || 'Sin plan'
    
    switch (plan.toLowerCase()) {
      case 'basic':
        return t('tenants.planBasic')
      case 'professional':
        return t('tenants.planProfessional')
      case 'enterprise':
        return t('tenants.planEnterprise')
      default:
        return plan
    }
  }

  // Handlers para los modales
  const handleCreate = () => {
    setIsCreateModalOpen(true)
  }

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsEditModalOpen(true)
  }

  const handleDelete = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsDeleteModalOpen(true)
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setIsSuccessModalOpen(true)
    loadTenants() // Recargar la lista
  }

  const closeAllModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setIsSuccessModalOpen(false)
    setSelectedTenant(null)
  }

  return (
    <div className={styles.containerTenants}>
      <div className={styles.topSection}>
        <div className={styles.headerWithToggle}>
          <h1 className={styles.title}>{t('tenants.title')}</h1>
          {!isMobile && (
            <ViewToggle 
              view={viewMode} 
              onViewChange={setViewMode}
            />
          )}
        </div>

        <div className={styles.positionButton}>
          <Button title={t('tenants.createTenant')} onClick={handleCreate} />
        </div>
      </div>

      <div className={styles.searchContainer}>
        <SearchInput
          placeholder={t('tenants.searchPlaceholder')}
          onInputChange={(value) => setSearchTerm(value)}
        />
      </div>

      <div className={styles.listContainer}>
        {loading ? (
          <>
            <div className={styles.cardsRow}>
              {[1,2,3].map((_,i) => <Skeleton key={i} height={120} width={"100%"} style={{borderRadius:12, marginBottom:16}} />)}
            </div>
            <Skeleton height={220} width={"100%"} style={{borderRadius:12, marginTop:16}} />
          </>
        ) : filteredTenants.length === 0 ? (
          <p className={styles.loader}>{t('tenants.noTenantsFound')}</p>
        ) : viewMode === 'table' ? (
          <>
            <DataTable
              data={paginatedTenants}
              columns={[
                {
                  key: 'name',
                  header: t('tenants.name'),
                  width: '20%'
                },
                {
                  key: 'subdomain',
                  header: t('tenants.subdomain'),
                  width: '15%'
                },
                {
                  key: 'plan',
                  header: t('tenants.plan'),
                  width: '12%',
                  render: (tenant) => translatePlan(tenant.plan)
                },
                {
                  key: 'users',
                  header: t('tenants.users'),
                  width: '12%',
                  align: 'center',
                  render: (tenant) => `${tenant.stats?.totalUsers || 0} / ${tenant.maxUsers}`
                },
                {
                  key: 'createdAt',
                  header: t('tenants.createdAt'),
                  width: '13%',
                  render: (tenant) => formatDate(tenant.createdAt)
                },
                {
                  key: 'status',
                  header: t('tenants.status'),
                  width: '10%',
                  align: 'center',
                  render: (tenant) => (
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(tenant.status) }}
                    >
                      {tenant.status}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  width: '18%',
                  align: 'center',
                  render: (tenant) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Tooltip content={t('tenants.editTenant')}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleEdit(tenant)}
                          aria-label={t('tenants.editTenant')}
                        >
                          <Edit size={20} />
                        </button>
                      </Tooltip>
                      <Tooltip content={t('tenants.deleteTenant')}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(tenant)}
                          aria-label={t('tenants.deleteTenant')}
                        >
                          <Trash size={20} />
                        </button>
                      </Tooltip>
                    </div>
                  )
                }
              ]}
              emptyMessage={t('tenants.noTenantsFound')}
            />
            <div className={styles.pagination}>
              <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                &lt;
              </button>
              <span>
                {t('tenants.page')} {currentPage} {t('tenants.of')} {totalPages}
              </span>
              <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
                &gt;
              </button>
            </div>
          </>
        ) : (
          <>
            {paginatedTenants.map((tenant) => (
                              <div key={tenant._id} className={styles.tenantCard}>
                  <div className={styles.tenantInfo}>
                    <h3 className={styles.tenantTitle}>{tenant.name}</h3>
                    <p className={styles.tenantDescription}>{tenant.subdomain}</p>
                    <div className={styles.tenantDetails}>
                      <div className={styles.tenantDetail}>
                        <Building size={16} />
                        <span>{t('tenants.plan')}: {translatePlan(tenant.plan)}</span>
                      </div>
                      <div className={styles.tenantDetail}>
                        <Users size={16} />
                        <span>{t('tenants.users')}: {tenant.stats?.totalUsers || 0} / {tenant.maxUsers}</span>
                      </div>
                      <div className={styles.tenantDetail}>
                        <Calendar size={16} />
                        <span>{t('tenants.createdAt')}: {formatDate(tenant.createdAt)}</span>
                      </div>
                    </div>
                    <div className={styles.tenantStatus}>
                      <span 
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(tenant.status) }}
                      >
                        {tenant.status}
                      </span>
                    </div>
                  </div>

                <div className={styles.cardSeparator}></div>

                <div className={styles.cardActions}>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.iconButton}
                      onClick={() => handleEdit(tenant)}
                      aria-label={t('tenants.editTenant')}
                      data-tooltip={t('tenants.editTenant')}
                    >
                      <Edit size={24} />
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={() => handleDelete(tenant)}
                      aria-label={t('tenants.deleteTenant')}
                      data-tooltip={t('tenants.deleteTenant')}
                    >
                      <Trash size={24} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className={styles.pagination}>
              <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                &lt;
              </button>
              <span>
                {t('tenants.page')} {currentPage} {t('tenants.of')} {totalPages}
              </span>
              <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
                &gt;
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      <ModalCreate
        isOpen={isCreateModalOpen}
        onClose={closeAllModals}
        onSuccess={() => handleSuccess(t('tenants.createSuccess'))}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        tenant={selectedTenant}
        onClose={closeAllModals}
        onSuccess={() => handleSuccess(t('tenants.updateSuccess'))}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        tenant={selectedTenant}
        onClose={closeAllModals}
        onSuccess={() => handleSuccess(t('tenants.deleteSuccess'))}
      />

      <ModalSuccess
        isOpen={isSuccessModalOpen}
        message={successMessage}
        onClose={closeAllModals}
      />
    </div>
  )
}

export default Tenants 