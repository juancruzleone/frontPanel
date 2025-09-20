import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import ModalViewInstallationTypes from "../features/installations/components/ModalViewInstallationTypes"
import ModalViewCategories from "../features/installations/components/ModalViewCategories"
import { Edit, Trash, Plus } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../store/authStore"


const Installations = () => {
  const { t, i18n } = useTranslation()
  const {
    installations,
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
  const translateInstallationType = (type: string) => {
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
      'Wohn': 'residential',
      'Gewerblich': 'commercial',
      'Industriell': 'industrial',
      'Medizinisch': 'medical',
      'Bildung': 'educational',
      'Einzelhandel': 'retail',
      'Logistik': 'logistics',
      'Fertigung': 'manufacturing',
      'Dienstleistung': 'service',
      'Andere': 'other',
      // Italiano
      'Ufficio': 'office',
      'Fabbrica': 'factory',
      'Magazzino': 'warehouse',
      'Negozio': 'store',
      'Ospedale': 'hospital',
      'Scuola': 'school',
      'Residenziale': 'residential',
      'Industriale': 'industrial',
      'Medico': 'medical',
      'Educativo_IT': 'educational',
      'Dettagliante': 'retail',
      'Logistica': 'logistics',
      'Produzione': 'manufacturing',
      'Servizio': 'service',
      'Altro': 'other',
      // Portugués
      'Escritório': 'office',
      'Armazém': 'warehouse',
      'Loja': 'store',
      'Escola': 'school',
      'Educacional': 'educational',
      'Varejista': 'retail',
      'Manufatura': 'manufacturing',
      'Serviço': 'service',
      'Outro': 'other'
    }
    
    // Buscar en el mapeo primero
    const mappedType = typeMapping[type]
    if (mappedType) {
      return t(`installations.installationTypes.${mappedType}`)
    }
    
    // Si no está en el mapeo, intentar normalizar
    const normalizedType = type.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    const translation = t(`installations.installationTypes.${normalizedType}`, type)
    return translation === type ? type : translation
  }

  // Función para traducir elementos de dirección
  const translateAddressElement = (element: string, type: string) => {
    if (!element) return ''
    
    // Normalizar el elemento para buscar en las traducciones
    const normalizedElement = element.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    
    // Intentar traducir, si no existe la traducción, devolver el original
    const translation = t(`installations.addressTypes.${normalizedElement}`, element)
    return translation === element ? element : translation
  }

  // Función para traducir la dirección completa
  const translateAddress = (province: string, city: string, address: string, floorSector: string) => {
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
  }

  const { categories, addCategory, loadCategories } = useCategories()
  const { installationTypes, addInstallationType, loadInstallationTypes } = useInstallationTypes()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isTechnician = role && ["tecnico", "técnico"].includes(role.toLowerCase())
  


  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false)
  const [isCreateInstallationTypeModalOpen, setIsCreateInstallationTypeModalOpen] = useState(false)
  const [isViewInstallationTypesModalOpen, setIsViewInstallationTypesModalOpen] = useState(false)
  const [isViewCategoriesModalOpen, setIsViewCategoriesModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<Installation | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [installationToDelete, setInstallationToDelete] = useState<Installation | null>(null)
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  useEffect(() => {
    document.title = t("installations.titlePage")
    loadCategories()
  }, [t, i18n.language, loadCategories])

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

  const filteredInstallations = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase()
    return installations.filter((inst) => {
      if (!inst) return false

      const fieldsToSearch = [
        inst.company || "",
        inst.address || "",
        inst.city || "",
        inst.province || "",
        inst.floorSector || "",
        inst.installationType || "",
        inst.postalCode || "",
      ]

      const matchesCategory = !selectedCategory || inst.installationType === selectedCategory
      const matchesSearch = fieldsToSearch.some((field) => field.toLowerCase().includes(searchTermLower))

      return matchesCategory && matchesSearch
    })
  }, [installations, selectedCategory, searchTerm])

  const totalPages = Math.ceil(filteredInstallations.length / itemsPerPage)
  const paginatedInstallations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredInstallations.slice(start, start + itemsPerPage)
  }, [filteredInstallations, currentPage])

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
    loadInstallations()
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessAddDevice = (message: string) => {
    setIsDeviceModalOpen(false)
    loadInstallations()
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
    loadInstallations()
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
      loadInstallations()
      setResponseMessage("Instalación eliminada con éxito")
      setIsError(false)
    } catch (err: any) {
      console.error("Error al eliminar instalación", err)
      setResponseMessage(err.message || "Error al eliminar instalación")
      setIsError(true)
    } finally {
      setInstallationToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  return (
    <>
      <div className={styles.containerInstallations}>
        <h1 className={styles.title}>{t('installations.title')}</h1>

        {!isTechnician && (
          <div className={styles.positionButton}>
            <Button title={t('installations.createInstallation')} onClick={handleOpenCreate} />
          </div>
        )}

        <div className={styles.typeButtons}>
          {!isTechnician && (
            <>
              <button className={styles.smallButton} onClick={() => setIsCreateInstallationTypeModalOpen(true)}>
                + {t('installations.createInstallationType')}
              </button>
              <button className={styles.smallButton} onClick={() => setIsCreateCategoryModalOpen(true)}>
                + {t('installations.createCategory')}
              </button>
            </>
          )}
          <button className={styles.manageButton} onClick={() => setIsViewInstallationTypesModalOpen(true)}>
            📋 {t('installations.viewInstallationTypes')}
          </button>
          <button className={styles.manageButton} onClick={() => setIsViewCategoriesModalOpen(true)}>
            📋 {t('installations.viewCategories')}
          </button>
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder={t('installations.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('installations.filterByInstallationType')}
            selectOptions={dynamicCategories}
            onInputChange={(value) => setSearchTerm(value)}
            onSelectChange={(value) => setSelectedCategory(value)}
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
          ) : filteredInstallations.length === 0 ? (
            <p className={styles.loader}>{t('installations.noInstallationsFound')}</p>
          ) : (
            <>
              {paginatedInstallations.map((inst) => (
                <div key={inst._id} className={styles.installationCard}>
                  <div className={styles.installationInfo}>
                    <h3 className={styles.installationTitle}>{inst.company}</h3>
                    <p className={styles.installationType}>{translateInstallationType(inst.installationType)}</p>
                    <address className={styles.installationAddress}>
                      {translateAddress(inst.province, inst.city, inst.address, inst.floorSector)}
                    </address>
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.iconButton}
                        onClick={() => handleOpenAddDevice(inst)}
                        aria-label={t('installations.addDevice')}
                        data-tooltip={t('installations.addDevice')}
                      >
                        <Plus size={24} />
                      </button>
                      {!isTechnician && (
                        <>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenEdit(inst)}
                            aria-label={t('installations.editInstallation')}
                            data-tooltip={t('installations.editInstallation')}
                          >
                            <Edit size={24} />
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() => {
                              setInstallationToDelete(inst)
                              setIsDeleteModalOpen(true)
                            }}
                            aria-label={t('installations.deleteInstallation')}
                            data-tooltip={t('installations.deleteInstallation')}
                          >
                            <Trash size={24} />
                          </button>
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
                <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                  &lt;
                </button>
                <span>
                  {t('installations.page')} {currentPage} {t('installations.of')} {totalPages}
                </span>
                <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
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

      <ModalViewInstallationTypes
        isOpen={isViewInstallationTypesModalOpen}
        onRequestClose={() => setIsViewInstallationTypesModalOpen(false)}
      />

      <ModalViewCategories
        isOpen={isViewCategoriesModalOpen}
        onRequestClose={() => setIsViewCategoriesModalOpen(false)}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={closeModal} mensaje={responseMessage} />
    </>
  )
}

export default Installations
