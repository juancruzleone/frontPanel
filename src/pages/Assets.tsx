import { useEffect, useMemo, useState } from "react"
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx"
import SearchInput from "../shared/components/Inputs/SearchInput.tsx"
import styles from "../features/assets/styles/assets.module.css"
import useAssets, { type Asset } from "../features/assets/hooks/useAssets"
import ModalCreate from "../features/assets/components/ModalCreate"
import ModalEdit from "../features/assets/components/ModalEdit"
import ModalSuccess from "../features/assets/components/ModalSuccess"
import ModalConfirmDelete from "../features/assets/components/ModalConfirmDelete"
import ModalAssignTemplate from "../features/assets/components/ModalAssignTemplate"
import { Edit, Trash, List, FileText } from "lucide-react"

const Assets = () => {
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
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  useEffect(() => {
    document.title = "Activos | LeoneSuite"
  }, [])

  const dynamicCategories = useMemo(
    () => [
      { label: "Todas", value: "" },
      ...categories.map((category) => ({
        label: category,
        value: category,
      })),
    ],
    [categories],
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
  }

  const handleSuccessAssignTemplate = (message: string) => {
    setIsTemplateModalOpen(false)
    loadAssets()
    setResponseMessage(message)
  }

  const closeModal = () => setResponseMessage("")

  const handleConfirmDelete = async () => {
    if (!assetToDelete || !assetToDelete._id) return

    try {
      await removeAsset(assetToDelete._id)
      loadAssets()
      setResponseMessage("Activo eliminado con éxito")
    } catch (err) {
      console.error("Error al eliminar activo", err)
      setResponseMessage("Error al eliminar activo")
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
        <h1 className={styles.title}>Activos</h1>
        <div className={styles.positionButton}>
          <Button title="Crear activo" onClick={handleOpenCreate} />
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder="Buscar por nombre, marca, modelo, número de serie o plantilla"
            showSelect
            selectPlaceholder="Filtrar por categoría de plantilla"
            selectOptions={dynamicCategories}
            onInputChange={(value) => setSearchTerm(value)}
            onSelectChange={(value) => setSelectedCategory(value)}
          />
        </div>

        <div className={styles.listContainer}>
          {loading ? (
            <p className={styles.loader}>Cargando activos...</p>
          ) : filteredAssets.length === 0 ? (
            <p className={styles.loader}>No se encontraron activos</p>
          ) : (
            <>
              {paginatedAssets.map((asset) => {
                const template = asset.templateId ? getTemplateById(asset.templateId) : null
                return (
                  <div key={asset._id} className={styles.assetCard}>
                    <div className={styles.assetInfo}>
                      <h3 className={styles.assetTitle}>{asset.nombre}</h3>
                      <p className={styles.assetDetails}>
                        {asset.marca} | {asset.modelo} | {asset.numeroSerie}
                      </p>
                      <div className={styles.assetMeta}>
                        {template && (
                          <>
                            <span className={styles.assetCategory}>{template.categoria}</span>
                            <span className={styles.assetTemplate}>
                              <FileText size={14} />
                              {template.nombre}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <div className={styles.positionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenAssignTemplate(asset)}
                          aria-label="Cambiar plantilla"
                          data-tooltip="Cambiar plantilla"
                        >
                          <List size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenEdit(asset)}
                          aria-label="Editar activo"
                          data-tooltip="Editar activo"
                        >
                          <Edit size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => {
                            setAssetToDelete(asset)
                            setIsDeleteModalOpen(true)
                          }}
                          aria-label="Eliminar activo"
                          data-tooltip="Eliminar activo"
                        >
                          <Trash size={24} />
                        </button>
                      </div>
                      <div className={styles.viewDetailsButton}>
                        <button onClick={() => handleViewDetails(asset)}>Ver detalles completos</button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(currentPage - 1)} disabled={currentPage === 1}>
                  &lt;
                </button>
                <span>
                  Página {currentPage} de {totalPages}
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
        title="¿Eliminar activo?"
        description="Esta acción no se puede deshacer."
      />

      <ModalSuccess isOpen={!!responseMessage} onRequestClose={closeModal} mensaje={responseMessage} />
    </>
  )
}

export default Assets
