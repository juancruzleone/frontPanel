import { useEffect, useMemo, useState, useCallback } from "react"
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/assets/styles/assets.module.css"
import useAssets, { type Asset } from "../features/assets/hooks/useAssets"
import ModalCreate from "../features/assets/components/ModalCreate"
import ModalEdit from "../features/assets/components/ModalEdit"
import ModalSuccess from "../features/assets/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalConfirmDelete from "../features/assets/components/ModalConfirmDelete"
import ModalAssignTemplate from "../features/assets/components/ModalAssignTemplate"
import ModalStock from "../features/assets/components/ModalStock"
import { Edit, Trash, List, BookOpen, HelpCircle, Plus, FilterX, Package } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { translateDeviceStatus } from "../shared/utils/backendTranslations"
import { useNavigate, useLocation } from "react-router-dom"
import { useAssetsTour } from "../features/assets/hooks/useAssetsTour"
import { useAuthStore } from "../store/authStore"
import { isClient } from "../shared/utils/roleUtils"
import TourButton from "../shared/components/Buttons/TourButton"

const Assets = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { tourCompleted, startTour, continueAssetsTour, skipTour } = useAssetsTour()
  const {
    assets,
    pagination,
    loading,
    templates,
    categories,
    addAsset,
    editAsset,
    removeAsset,
    loadAssets,
    assignTemplateToAsset,
    getTemplateById,
    updateAssetStock,
  } = useAssets()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<Asset | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const itemsPerPage = 4

  const role = useAuthStore((s) => s.role)
  const isClientUser = role && isClient(role)

  useEffect(() => {
    document.title = t("assets.titlePage")
  }, [t, i18n.language])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted) {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour])

  // Continuar el tour si venimos de formularios
  useEffect(() => {
    if (location.state?.fromFormsTour && !tourCompleted) {
      const timer = setTimeout(() => {
        continueAssetsTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [location.state, tourCompleted, continueAssetsTour])

  const dynamicCategories = useMemo(
    () => [
      { label: t('common.all'), value: "" },
      ...categories.map((category) => ({
        label: category,
        value: category,
      })),
    ],
    [categories, t],
  )

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true)
    setInitialData(null)
  }

  const handleOpenEdit = (asset: Asset) => {
    setInitialData(asset)
    setIsEditModalOpen(true)
  }

  const handleOpenTemplate = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsTemplateModalOpen(true)
  }

  const handleOpenStock = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsStockModalOpen(true)
  }

  const handleSuccessCreateOrEdit = (message: string) => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    loadAssets({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessAssignTemplate = (message: string) => {
    setIsTemplateModalOpen(false)
    loadAssets({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessStock = (message: string) => {
    setIsStockModalOpen(false)
    loadAssets({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    setResponseMessage(message)
    setIsError(false)
  }

  const handleError = (message: string) => {
    setResponseMessage(message)
    setIsError(true)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsTemplateModalOpen(false)
    setIsStockModalOpen(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete || !assetToDelete._id) return

    try {
      await removeAsset(assetToDelete._id)
      loadAssets({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
      setResponseMessage("Activo eliminado con éxito")
      setIsError(false)
    } catch (err: any) {
      setResponseMessage(err.message || "Error al eliminar activo")
      setIsError(true)
    } finally {
      setAssetToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadAssets({ page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadAssets({ page: 1, limit: itemsPerPage, search: value, category: selectedCategory })
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    loadAssets({ page: 1, limit: itemsPerPage, search: searchTerm, category: value })
  }

  return (
    <>
      <div className={styles.containerAssets}>
        <div className={styles.topSection}>
          <h1 className={styles.title}>{t('assets.title')}</h1>

          {!isClientUser && (
            <div className={styles.positionButton}>
              <Button title={t('assets.createAsset')} onClick={handleOpenCreate} data-tour="create-asset-btn" />
              <button
                className={styles.manualsButton}
                onClick={() => navigate('/manuales')}
                aria-label={t('nav.manuals')}
                data-tour="view-manuals-btn"
              >
                <BookOpen size={20} />
                <span>{t('nav.manuals')}</span>
              </button>
            </div>
          )}
        </div>

        <div className={styles.searchRow}>
          <div className={styles.searchContainerInner} data-tour="search-filter">
            <SearchInput
              placeholder={t('assets.searchPlaceholder')}
              showSelect={true}
              selectPlaceholder={t('forms.filterByCategory') || "Filtrar por categoría"}
              selectOptions={dynamicCategories}
              onInputChange={handleSearch}
              onSelectChange={handleCategoryChange}
              value={searchTerm}
              selectValue={selectedCategory}
            />
          </div>
          <button
            onClick={() => {
              setSearchTerm("")
              setSelectedCategory("")
              loadAssets({ page: 1, limit: itemsPerPage, search: "", category: "" })
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
                {[1, 2, 3, 4].map((_, i) => <Skeleton key={i} height={100} width={"100%"} style={{ borderRadius: 14 }} />)}
              </div>
            </div>
          ) : assets.length === 0 ? (
            <p className={styles.loader}>{t('assets.noAssetsFound')}</p>
          ) : (
            <>
              {assets.map((asset, index) => {
                const template = asset.templateId ? getTemplateById(asset.templateId) : null

                return (
                  <div key={asset._id || `asset-${index}`} className={styles.assetCard}>
                    <div className={styles.assetInfo}>
                      <h3 className={styles.assetTitle}>{asset.nombre}</h3>
                      <p className={styles.assetTemplate}>
                        <List size={14} style={{ marginRight: 6 }} />
                        {template ? template.nombre : t('assets.noTemplateAssigned')}
                      </p>
                      <p className={styles.assetDetails}>
                        {asset.marca} {asset.modelo} {asset.numeroSerie && `| SN: ${asset.numeroSerie}`}
                      </p>
                      {asset.stock !== undefined && (
                        <p className={styles.assetStock}>
                          <Package size={14} style={{ marginRight: 6 }} />
                          {t('assets.stock.stock')}: <strong>{asset.stock}</strong>
                        </p>
                      )}
                    </div>

                    <div className={styles.cardSeparator}></div>

                    {!isClientUser && (
                      <div className={styles.cardActions}>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenStock(asset)}
                            aria-label={t('assets.stock.manageStock')}
                            data-tooltip={t('assets.stock.manageStock')}
                            data-tour="manage-stock-btn"
                          >
                            <Package size={24} />
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenTemplate(asset)}
                            aria-label={t('assets.assignTemplate')}
                            data-tooltip={t('assets.assignTemplate')}
                            data-tour="assign-template-btn"
                          >
                            <Plus size={24} />
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() => handleOpenEdit(asset)}
                            aria-label={t('assets.editAsset')}
                            data-tooltip={t('assets.editAsset')}
                            data-tour="edit-asset-btn"
                          >
                            <Edit size={24} />
                          </button>
                          <button
                            className={styles.iconButton}
                            onClick={() => {
                              setAssetToDelete(asset)
                              setIsDeleteModalOpen(true)
                            }}
                            aria-label={t('assets.deleteAsset')}
                            data-tooltip={t('assets.deleteAsset')}
                            data-tour="delete-asset-btn"
                          >
                            <Trash size={24} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(pagination.page - 1)} disabled={pagination.page === 1}>
                  &lt;
                </button>
                <span>
                  {t('assets.page')} {pagination.page} {t('assets.of')} {pagination.totalPages}
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
        onAdd={addAsset}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateOrEdit}
        onEdit={editAsset}
        initialData={initialData}
      />

      <ModalAssignTemplate
        isOpen={isTemplateModalOpen}
        onRequestClose={() => setIsTemplateModalOpen(false)}
        onAssignTemplate={assignTemplateToAsset}
        asset={selectedAsset}
        onSubmitSuccess={handleSuccessAssignTemplate}
      />

      <ModalStock
        isOpen={isStockModalOpen}
        onRequestClose={() => setIsStockModalOpen(false)}
        asset={selectedAsset}
        onUpdateStock={updateAssetStock}
        onSuccess={handleSuccessStock}
        onError={handleError}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('assets.confirmDeleteTitle')}
        description={t('assets.confirmDeleteDescription')}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={closeModal} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      {!isClientUser && (
        <TourButton
          onClick={tourCompleted ? startTour : skipTour}
          label={tourCompleted ? t('assets.tour.buttons.restart') : t('assets.tour.buttons.skip')}
        />
      )}
    </>
  )
}

export default Assets
