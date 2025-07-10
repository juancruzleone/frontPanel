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


const Installations = () => {
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

  const { categories, addCategory, loadCategories } = useCategories()
  const { installationTypes, addInstallationType, loadInstallationTypes } = useInstallationTypes()
  const navigate = useNavigate()
  


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
    document.title = "Instalaciones | LeoneSuite"
    loadCategories()
  }, [loadCategories])

  const dynamicCategories = useMemo(
    () => [
      { label: "Todas", value: "" },
      ...installationTypes.map((type) => ({
        label: type.nombre,
        value: type.nombre,
      })),
    ],
    [installationTypes],
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
        <h1 className={styles.title}>Instalaciones</h1>

        <div className={styles.positionButton}>
          <Button title="Crear instalación" onClick={handleOpenCreate} />
        </div>

        <div className={styles.typeButtons}>
          <button className={styles.smallButton} onClick={() => setIsCreateInstallationTypeModalOpen(true)}>
            + Crear tipo de instalación
          </button>
          <button className={styles.smallButton} onClick={() => setIsCreateCategoryModalOpen(true)}>
            + Crear categoría de dispositivo
          </button>
          <button className={styles.manageButton} onClick={() => setIsViewInstallationTypesModalOpen(true)}>
            📋 Ver tipos creados
          </button>
          <button className={styles.manageButton} onClick={() => setIsViewCategoriesModalOpen(true)}>
            📋 Ver categorías creadas
          </button>
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder="Buscar por empresa, dirección, ciudad, provincia o tipo"
            showSelect
            selectPlaceholder="Filtrar por tipo de instalación"
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
            <p className={styles.loader}>No se encontraron instalaciones</p>
          ) : (
            <>
              {paginatedInstallations.map((inst) => (
                <div key={inst._id} className={styles.installationCard}>
                  <div className={styles.installationInfo}>
                    <h3 className={styles.installationTitle}>{inst.company}</h3>
                    <p className={styles.installationType}>{inst.installationType}</p>
                    <address className={styles.installationAddress}>
                      {inst.province} | {inst.city} | {inst.address} | {inst.floorSector}
                    </address>
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.iconButton}
                        onClick={() => handleOpenAddDevice(inst)}
                        aria-label="Agregar dispositivo"
                        data-tooltip="Agregar dispositivo"
                      >
                        <Plus size={24} />
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={() => handleOpenEdit(inst)}
                        aria-label="Editar instalación"
                        data-tooltip="Editar instalación"
                      >
                        <Edit size={24} />
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={() => {
                          setInstallationToDelete(inst)
                          setIsDeleteModalOpen(true)
                        }}
                        aria-label="Eliminar instalación"
                        data-tooltip="Eliminar instalación"
                      >
                        <Trash size={24} />
                      </button>
                    </div>

                    <div className={styles.viewDevicesButton}>
                      <button onClick={() => handleViewDevices(inst)}>Ver listado de dispositivos</button>
                    </div>
                  </div>
                </div>
              ))}

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
        title="¿Eliminar instalación?"
        description="Esta acción no se puede deshacer."
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
