import { useEffect, useMemo, useState, useCallback } from "react"
import { useNavigate } from "react-router"
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/installations/styles/installations.module.css"
import useInstallations, { type Installation } from "../features/installations/hooks/useInstallations"
import useCategories from "../features/installations/hooks/useCategories"
import useInstallationTypes from "../features/installations/hooks/useInstallationTypes"
import ModalCreate from "../features/installations/components/ModalCreate"
import ModalEdit from "../features/installations/components/ModalEdit"
import ModalSuccess from "../features/installations/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalConfirmDelete from "../features/installations/components/ModalConfirmDelete"
import ModalAddDevice from "../features/installations/components/ModalAddDevice"
import ModalCreateCategory from "../features/installations/components/ModalCreateCategory"
import ModalCreateInstallationType from "../features/installations/components/ModalCreateInstallationType"
import ModalManageInstallationTypes from "../features/installations/components/ModalManageInstallationTypes"
import ModalManageCategories from "../features/installations/components/ModalManageCategories"
import ModalRequestMaintenance from "../features/maintenanceRequests/components/ModalRequestMaintenance"
import { useMaintenanceRequests } from "../features/maintenanceRequests/hooks/useMaintenanceRequests"
import { Edit, Trash, Plus, HelpCircle, Users, FilterX, List, Wrench } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../store/authStore"
import { useInstallationsTour } from "../features/installations/hooks/useInstallationsTour"
import { isClient, isTechnician as checkIsTechnician } from "../shared/utils/roleUtils"
import TourButton from "../shared/components/Buttons/TourButton"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"
import DataTable from "../components/DataTable/DataTable"
import Tooltip from "../shared/components/Tooltip/Tooltip"


const Installations = () => {
  const { t, i18n } = useTranslation()
  const {
    installations,
    pagination,
    loading,
    assets,
    loadingAssets,
    errorLoadingAssets,
    loadInstallations,
    loadAssets,
    addInstallation,
    editInstallation,
    removeInstallation,
    addDeviceToInstallation,
  } = useInstallations()

  // Función para traducir el tipo de instalación
  const translateInstallationType = useCallback((type: string) => {
    if (!type) return ''

    // Mapeo sin duplicados
    const typeMapping: { [key: string]: string } = {
      // Español
      'Oficina': 'office',
      'Fábrica': 'factory',
      'Almacén': 'warehouse',
      'Tienda': 'store',
      'Hospital': 'hospital',
      'Escuela': 'school',
      'Residencial': 'residential',
      'Comercial': 'commercial',
      'Industrial': 'industrial',
      'Médico': 'medical',
      'Educativo': 'educational',
      'Minorista': 'retail',
      'Logística': 'logistics',
      'Manufactura': 'manufacturing',
      'Servicio': 'service',
      'Otro': 'other',
      // Inglés
      'Office': 'office',
      'Factory': 'factory',
      'Warehouse': 'warehouse',
      'Store': 'store',
      'School': 'school',
      'Residential': 'residential',
      'Commercial': 'commercial',
      'Medical': 'medical',
      'Educational': 'educational',
      'Logistics': 'logistics',
      'Manufacturing': 'manufacturing',
      'Other': 'other',
      // Francés
      'Bureau': 'office',
      'Usine': 'factory',
      'Entrepôt': 'warehouse',
      'Magasin': 'store',
      'Hôpital': 'hospital',
      'École': 'school',
      'Résidentiel': 'residential',
      'Industriel': 'industrial',
      'Médical': 'medical',
      'Éducatif': 'educational',
      'Détaillant': 'retail',
      'Logistique': 'logistics',
      'Fabrication': 'manufacturing',
      'Autre': 'other',
      // Alemán
      'Büro': 'office',
      'Fabrik': 'factory',
      'Lager': 'warehouse',
      'Geschäft': 'store',
      'Krankenhaus': 'hospital',
      'Schule': 'school',
      'Universität': 'university',
      'Wohnen': 'residential',
      'Gewerbe': 'commercial',
      'Industrie': 'industrial',
      'Medizin': 'medical',
      'Bildung': 'educational',
      'Einzelhandel': 'retail',
      'Logistik': 'logistics',
      'Fertigung': 'manufacturing',
      'Dienstleistung': 'service',
      'Sonstiges': 'other'
    }

    const key = typeMapping[type] || type.toLowerCase()
    return t(`installations.types.${key}`, type)
  }, [t])

  // Función para traducir elementos de dirección
  const translateAddressElement = useCallback((element: string, type: string) => {
    if (!element) return ''

    // Normalizar el elemento para buscar en las traducciones
    const normalizedElement = element.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

    // Intentar traducir, si no existe la traducción, devolver el original
    const translation = t(`installations.addressTypes.${normalizedElement}`, element)
    return translation === element ? element : translation
  }, [t])

  // Función para traducir la dirección completa
  const translateAddress = useCallback((province: string, city: string, address: string, floorSector: string) => {
    const parts = []

    if (province) {
      const translatedProvince = translateAddressElement(province, 'province')
      parts.push(translatedProvince)
    }

    if (city) {
      const translatedCity = translateAddressElement(city, 'city')
      parts.push(translatedCity)
    }

    if (address) {
      const translatedAddress = translateAddressElement(address, 'address')
      parts.push(translatedAddress)
    }

    if (floorSector) {
      const translatedFloorSector = translateAddressElement(floorSector, 'floorSector')
      parts.push(translatedFloorSector)
    }

    return parts.join(' | ')
  }, [translateAddressElement])

  const { categories, addCategory, loadCategories } = useCategories()
  const { installationTypes, addInstallationType, loadInstallationTypes } = useInstallationTypes()
  const navigate = useNavigate()

  const role = useAuthStore((s) => s.role)
  const isTechnician = role && checkIsTechnician(role)
  const isClientUser = role && isClient(role)
  const isRestricted = isTechnician || isClientUser
  const { tourCompleted, startTour, skipTour } = useInstallationsTour()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false)
  const [isCreateInstallationTypeModalOpen, setIsCreateInstallationTypeModalOpen] = useState(false)
  const [isManageInstallationTypesModalOpen, setIsManageInstallationTypesModalOpen] = useState(false)
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false)
  const [isRequestMaintenanceModalOpen, setIsRequestMaintenanceModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<Installation | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [installationToDelete, setInstallationToDelete] = useState<Installation | null>(null)
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)
  const [viewMode, setViewMode, isMobile] = useResponsiveView('installations-view', 'cards')
  const itemsPerPage = 4

  // Hook para solicitudes de mantenimiento
  const { createRequest } = useMaintenanceRequests()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Cargar instalaciones cuando esté autenticado (ya no necesitamos token en localStorage)
  useEffect(() => {
    if (isAuthenticated) {
      loadInstallations({ page: 1, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    }
  }, [isAuthenticated])

  useEffect(() => {
    document.title = t("installations.titlePage")
    loadCategories()
  }, [t, i18n.language])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    // Verificar si el tour de onboarding global ya se completó
    const onboardingCompleted = localStorage.getItem('onboarding-tour-v2-shown');
    
    if (!loading && !tourCompleted && !isRestricted && onboardingCompleted === 'true') {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour, isRestricted])

  const dynamicCategories = useMemo(
    () => [
      { label: t('common.all'), value: "" },
      ...installationTypes.map((type) => ({
        label: type.nombre,
        value: type.nombre,
      })),
    ],
    [installationTypes, t],
  )

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true)
    setInitialData(null)
  }

  const handleOpenEdit = (inst: Installation) => {
    setInitialData(inst)
    setIsEditModalOpen(true)
  }

  const handleOpenAddDevice = (inst: Installation) => {
    setSelectedInstallation(inst)
    setIsDeviceModalOpen(true)
  }

  const handleViewDevices = (inst: Installation) => {
    if (inst._id) {
      navigate(`/instalaciones/${inst._id}`, {
        state: { installationName: inst.company },
      })
    }
  }

  const handleSuccessCreateOrEdit = (message: string) => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    loadInstallations({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessAddDevice = (message: string) => {
    setIsDeviceModalOpen(false)
    loadInstallations({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessCreateCategory = (message: string) => {
    setIsCreateCategoryModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessCreateInstallationType = async (message: string) => {
    setIsCreateInstallationTypeModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
    // Recargar tipos de instalación para actualizar la lista
    await loadInstallationTypes()
    // Recargar instalaciones para actualizar los tipos
    loadInstallations({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
  }

  const handleSubmitMaintenanceRequest = async (data: any) => {
    try {
      const result = await createRequest(data)
      setIsRequestMaintenanceModalOpen(false)
      setResponseMessage(result.message)
      setIsError(false)
      return result
    } catch (error: any) {
      setIsError(true)
      setResponseMessage(error.response?.data?.error || t('maintenanceRequests.error.createFailed'))
      throw error
    }
  }

  const handleError = (message: string) => {
    setResponseMessage(message)
    setIsError(true)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeviceModalOpen(false)
    setIsCreateCategoryModalOpen(false)
    setIsCreateInstallationTypeModalOpen(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleConfirmDelete = async () => {
    if (!installationToDelete || !installationToDelete._id) return

    try {
      await removeInstallation(installationToDelete._id)
      loadInstallations({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
      setResponseMessage(t('installations.installationDeleted'))
      setIsError(false)
    } catch (err: any) {
      setResponseMessage(err.message || t('installations.errorDeletingInstallation'))
      setIsError(true)
    } finally {
      setInstallationToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadInstallations({ page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadInstallations({ page: 1, limit: itemsPerPage, search: value, category: selectedCategory })
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    loadInstallations({ page: 1, limit: itemsPerPage, search: searchTerm, category: value })
  }

  return (
    <>
      <div className={styles.containerInstallations}>
        <div className={styles.topSection}>
          <div className={styles.headerWithToggle}>
            <h1 className={styles.title}>{t('installations.title')}</h1>
            {!isMobile && (
              <ViewToggle 
                view={viewMode} 
                onViewChange={setViewMode}
              />
            )}
          </div>

          {!isRestricted && (
            <div className={styles.positionButton}>
              <Button title={t('installations.createInstallation')} onClick={handleOpenCreate} data-tour="create-installation-btn" />
              <button
                className={styles.clientsButton}
                onClick={() => navigate('/clientes')}
                aria-label={t('nav.clients')}
              >
                <Users size={20} />
                <span>{t('nav.clients')}</span>
              </button>
            </div>
          )}
        </div>


        <div className={styles.searchRow}>
          <div className={styles.searchContainerInner} data-tour="search-filter">
            <SearchInput
              placeholder={t('installations.searchPlaceholder')}
              showSelect
              selectPlaceholder={t('installations.filterByInstallationType')}
              selectOptions={dynamicCategories}
              onInputChange={handleSearch}
              onSelectChange={handleCategoryChange}
              value={searchTerm}
              selectValue={selectedCategory}
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
              loadInstallations({ page: 1, limit: itemsPerPage, search: "", category: "" });
            }}
            className={styles.clearFilters}
            title={t('calendar.clearFilters')}
          >
            <FilterX size={20} />
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
          ) : installations.length === 0 ? (
            <p className={styles.loader}>{t('installations.noInstallationsFound')}</p>
          ) : viewMode === 'table' ? (
            <>
              <DataTable
                data={installations}
                columns={[
                  {
                    key: 'company',
                    header: t('installations.company'),
                    width: isClientUser ? '35%' : '25%'
                  },
                  {
                    key: 'installationType',
                    header: t('installations.type'),
                    width: isClientUser ? '20%' : '15%',
                    render: (inst) => translateInstallationType(inst.installationType)
                  },
                  {
                    key: 'address',
                    header: t('installations.address'),
                    width: isClientUser ? '35%' : '35%',
                    render: (inst) => translateAddress(inst.province || "", inst.city || "", inst.address, inst.floorSector || "")
                  },
                  {
                    key: 'actions',
                    header: t('common.actions'),
                    width: isClientUser ? '30%' : '25%',
                    align: 'center' as const,
                    render: (inst: any) => (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {isClientUser && (
                          <Tooltip content={t('maintenanceRequests.requestMaintenance')}>
                            <button
                              className={styles.iconButton}
                              onClick={() => {
                                setSelectedInstallation(inst)
                                setIsRequestMaintenanceModalOpen(true)
                              }}
                              aria-label={t('maintenanceRequests.requestMaintenance')}
                            >
                              <Wrench size={20} />
                            </button>
                          </Tooltip>
                        )}
                        {!isClientUser && (
                          <Tooltip content={t('installations.addDevice')}>
                            <button
                              className={styles.iconButton}
                              onClick={() => handleOpenAddDevice(inst)}
                              aria-label={t('installations.addDevice')}
                            >
                              <Plus size={20} />
                            </button>
                          </Tooltip>
                        )}
                        {!isRestricted && (
                          <>
                            <Tooltip content={t('installations.editInstallation')}>
                              <button
                                className={styles.iconButton}
                                onClick={() => handleOpenEdit(inst)}
                                aria-label={t('installations.editInstallation')}
                              >
                                <Edit size={20} />
                              </button>
                            </Tooltip>
                            <Tooltip content={t('installations.deleteInstallation')}>
                              <button
                                className={styles.iconButton}
                                onClick={() => {
                                  setInstallationToDelete(inst)
                                  setIsDeleteModalOpen(true)
                                }}
                                aria-label={t('installations.deleteInstallation')}
                              >
                                <Trash size={20} />
                              </button>
                            </Tooltip>
                          </>
                        )}
                        <button 
                          onClick={() => handleViewDevices(inst)}
                          className={styles.viewDevicesTableButton}
                        >
                          <List size={16} />
                          <span>{t('installations.viewDeviceList')}</span>
                        </button>
                      </div>
                    )
                  }
                ]}
                emptyMessage={t('installations.noInstallationsFound')}
              />
              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(pagination.page - 1)} disabled={pagination.page === 1}>
                  &lt;
                </button>
                <span>
                  {t('installations.page')} {pagination.page} {t('installations.of')} {pagination.totalPages}
                </span>
                <button onClick={() => handleChangePage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                  &gt;
                </button>
              </div>
            </>
          ) : (
            <>
              {installations.map((inst) => (
                <div key={inst._id} className={styles.installationCard}>
                  <div className={styles.installationInfo}>
                    <h3 className={styles.installationTitle}>{inst.company}</h3>
                    <p className={styles.installationType}>{translateInstallationType(inst.installationType)}</p>
                    <address className={styles.installationAddress}>
                      {translateAddress(inst.province || "", inst.city || "", inst.address, inst.floorSector || "")}
                    </address>
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    <div className={styles.actionButtons}>
                      {isClientUser && (
                        <Tooltip content={t('maintenanceRequests.requestMaintenance')}>
                          <button
                            className={styles.iconButton}
                            onClick={() => {
                              setSelectedInstallation(inst)
                              setIsRequestMaintenanceModalOpen(true)
                            }}
                            aria-label={t('maintenanceRequests.requestMaintenance')}
                            data-tooltip={t('maintenanceRequests.requestMaintenance')}
                          >
                            <Wrench size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {!isClientUser && (
                        <>
                          <Tooltip content={t('installations.addDevice')}>
                            <button
                              className={styles.iconButton}
                              onClick={() => handleOpenAddDevice(inst)}
                              aria-label={t('installations.addDevice')}
                              data-tooltip={t('installations.addDevice')}
                            >
                              <Plus size={20} />
                            </button>
                          </Tooltip>
                          {!isRestricted && (
                            <>
                              <Tooltip content={t('installations.editInstallation')}>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleOpenEdit(inst)}
                                  aria-label={t('installations.editInstallation')}
                                  data-tooltip={t('installations.editInstallation')}
                                >
                                  <Edit size={20} />
                                </button>
                              </Tooltip>
                              <Tooltip content={t('installations.deleteInstallation')}>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => {
                                    setInstallationToDelete(inst)
                                    setIsDeleteModalOpen(true)
                                  }}
                                  aria-label={t('installations.deleteInstallation')}
                                  data-tooltip={t('installations.deleteInstallation')}
                                >
                                  <Trash size={20} />
                                </button>
                              </Tooltip>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <div className={styles.viewDevicesButton}>
                      <button onClick={() => handleViewDevices(inst)}>{t('installations.viewDeviceList')}</button>
                    </div>
                  </div>
                </div>
              ))}

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(pagination.page - 1)} disabled={pagination.page === 1}>
                  &lt;
                </button>
                <span>
                  {t('installations.page')} {pagination.page} {t('installations.of')} {pagination.totalPages}
                </span>
                <button onClick={() => handleChangePage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                  &gt;
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ModalCreate
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateOrEdit}
        onSubmitError={handleError}
        onAdd={addInstallation}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateOrEdit}
        onSubmitError={handleError}
        onEdit={editInstallation}
        initialData={initialData}
      />

      <ModalAddDevice
        isOpen={isDeviceModalOpen}
        onRequestClose={() => setIsDeviceModalOpen(false)}
        onSubmitSuccess={handleSuccessAddDevice}
        onAddDevice={addDeviceToInstallation}
        installation={selectedInstallation}
        assets={assets}
        loadingAssets={loadingAssets}
        errorLoadingAssets={errorLoadingAssets}
        onRetryLoadAssets={loadAssets}
        loadAssets={loadAssets}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('installations.confirmDeleteTitle')}
        description={t('installations.confirmDeleteDescription')}
      />

      <ModalCreateCategory
        isOpen={isCreateCategoryModalOpen}
        onRequestClose={() => setIsCreateCategoryModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateCategory}
        onCreate={addCategory}
      />

      <ModalCreateInstallationType
        isOpen={isCreateInstallationTypeModalOpen}
        onRequestClose={() => setIsCreateInstallationTypeModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateInstallationType}
        onCreate={addInstallationType}
      />

      <ModalManageInstallationTypes
        isOpen={isManageInstallationTypesModalOpen}
        onRequestClose={() => setIsManageInstallationTypesModalOpen(false)}
      />

      <ModalManageCategories
        isOpen={isManageCategoriesModalOpen}
        onRequestClose={() => setIsManageCategoriesModalOpen(false)}
      />

      <ModalRequestMaintenance
        isOpen={isRequestMaintenanceModalOpen}
        onClose={() => setIsRequestMaintenanceModalOpen(false)}
        installations={installations}
        onSubmit={handleSubmitMaintenanceRequest}
        userInfo={{
          nombre: user || '',
          email: '',
          telefono: ''
        }}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={closeModal} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      {/* Botón flotante del tour estilo WhatsApp */}
      {!isRestricted && (
        <TourButton
          onClick={tourCompleted ? startTour : skipTour}
          label={tourCompleted ? t('installations.tour.buttons.restart') : t('installations.tour.buttons.skip')}
        />
      )}
    </>
  )
}

export default Installations
