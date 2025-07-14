import { useEffect, useMemo, useState } from "react"
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
import { Edit, Trash, List, FileText } from "lucide-react"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { translateDeviceStatus } from "../shared/utils/backendTranslations"

const Assets = () => {
  const { t } = useTranslation()
  const {
    assets,
    loading,
    templates,
    categories,
    addAsset,
    editAsset,
    removeAsset,
    loadAssets,
    assignTemplateToAsset,
    getTemplateById,
  } = useAssets()

  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [initialData, setInitialData] = useState<Asset | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  useEffect(() => {
    document.title = "Activos | LeoneSuite"
  }, [])

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

  const filteredAssets = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase()

    return assets.filter((asset) => {
      if (!asset) return false

      // Obtener información de la plantilla
      const template = asset.templateId ? getTemplateById(asset.templateId) : null

      // Campos a buscar
      const fieldsToSearch = [
        asset.nombre || "",
        asset.marca || "",
        asset.modelo || "",
        asset.numeroSerie || "",
        template?.nombre || "",
        template?.categoria || "",
      ]

      // Filtros por categoría de plantilla
      const matchesCategory = !selectedCategory || template?.categoria === selectedCategory

      // Búsqueda
      const matchesSearch = fieldsToSearch.some((field) => field.toLowerCase().includes(searchTermLower))

      return matchesCategory && matchesSearch
    })
  }, [assets, selectedCategory, searchTerm, getTemplateById])

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAssets.slice(start, start + itemsPerPage)
  }, [filteredAssets, currentPage])

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true)
    setInitialData(null)
  }

  const handleOpenEdit = (asset: Asset) => {
    setInitialData(asset)
    setIsEditModalOpen(true)
  }

  const handleOpenAssignTemplate = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsTemplateModalOpen(true)
  }

  const handleSuccessCreateOrEdit = (message: string) => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    loadAssets()
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessAssignTemplate = (message: string) => {
    setIsTemplateModalOpen(false)
    loadAssets()
    setResponseMessage(message)
    setIsError(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete || !assetToDelete._id) return

    try {
      await removeAsset(assetToDelete._id)
      loadAssets()
      setResponseMessage(t('assets.assetDeleted'))
      setIsError(false)
    } catch (err: any) {
      console.error("Error al eliminar activo", err)
      setResponseMessage(err.message || t('assets.errorDeletingAsset'))
      setIsError(true)
    } finally {
      setAssetToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleViewDetails = (asset: Asset) => {
    console.log("Ver detalles del activo:", asset)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  return (
    <>
      <div className={styles.containerAssets}>
        <h1 className={styles.title}>{t('assets.title')}</h1>
        <div className={styles.positionButton}>
          <Button title={t('assets.createAsset')} onClick={handleOpenCreate} />
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder={t('assets.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('assets.filterByTemplateCategory')}
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
          ) : filteredAssets.length === 0 ? (
            <p className={styles.loader}>{t('assets.noAssetsFound')}</p>
          ) : (
            <>
              {paginatedAssets.map((asset) => {
                const template = asset.templateId ? getTemplateById(asset.templateId) : null
                return (
                  <div key={asset._id} className={styles.assetCard}>
                    <div className={styles.assetInfo}>
                      <h3 className={styles.assetTitle}>{asset.nombre}</h3>
                      <div className={styles.assetDetails}>
                        <p>
                          <strong>{t('assets.brand')}:</strong> {asset.marca}
                        </p>
                        <p>
                          <strong>{t('assets.model')}:</strong> {asset.modelo}
                        </p>
                        <p>
                          <strong>{t('assets.serialNumber')}:</strong> {asset.numeroSerie}
                        </p>
                        {template && (
                          <p>
                            <strong>{t('assets.template')}:</strong> {template.nombre}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardSeparator}></div>

                    <div className={styles.cardActions}>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenEdit(asset)}
                          aria-label={t('assets.editAssetTooltip')}
                          data-tooltip={t('assets.editAssetTooltip')}
                        >
                          <Edit size={20} />
                        </button>

                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenAssignTemplate(asset)}
                          aria-label={t('assets.assignTemplateTooltip')}
                          data-tooltip={t('assets.assignTemplateTooltip')}
                        >
                          <List size={20} />
                        </button>

                        <button
                          className={styles.iconButton}
                          onClick={() => handleViewDetails(asset)}
                          aria-label={t('assets.viewDetailsTooltip')}
                          data-tooltip={t('assets.viewDetailsTooltip')}
                        >
                          <FileText size={20} />
                        </button>

                        <button
                          className={styles.iconButton}
                          onClick={() => {
                            setAssetToDelete(asset)
                            setIsDeleteModalOpen(true)
                          }}
                          aria-label={t('assets.deleteAssetTooltip')}
                          data-tooltip={t('assets.deleteAssetTooltip')}
                        >
                          <Trash size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                  {"<"}
                </button>
                <span>
                  {t('assets.page')} {currentPage} {t('assets.of')} {totalPages}
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
        onSubmitSuccess={handleSuccessCreateOrEdit}
        onSubmitError={(message) => {
          setResponseMessage(message)
          setIsError(true)
        }}
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
        onSubmitSuccess={handleSuccessAssignTemplate}
        onAssignTemplate={assignTemplateToAsset}
        asset={selectedAsset}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('assets.confirmDeleteAsset')}
        description={t('assets.confirmDeleteAssetDescription')}
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

export default Assets
