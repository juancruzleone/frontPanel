import { useEffect, useMemo, useState } from "react"
import Button from "../../src/shared/components/Buttons/buttonCreate"
import SearchInput from "../shared/components/Inputs/SearchInput"
import styles from "../features/forms/styles/forms.module.css"
import useForms from "../features/forms/hooks/useForms"
import ModalCreateForm from "../features/forms/components/ModalCreateForm"
import ModalEditForm from "../features/forms/components/ModalEditForm"
import ModalSuccess from "../features/forms/components/ModalSuccess"
import ModalConfirmDelete from "../features/forms/components/ModalConfirmDelete"
import { Edit, Trash } from "lucide-react"
import type { FormTemplate } from "../features/forms/hooks/useForms"
import Skeleton from '../shared/components/Skeleton'

const Forms = () => {
  const { templates, loading, categories, loadTemplates, addTemplate, editTemplate, removeTemplate } = useForms()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    document.title = "Plantillas de Formularios | LeoneSuite"
  }, [])

  const filteredTemplates = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase()
    return templates.filter((template) => {
      const matchesCategory = !selectedCategory || template.categoria === selectedCategory
      const matchesSearch =
        template.nombre.toLowerCase().includes(searchTermLower) ||
        template.categoria.toLowerCase().includes(searchTermLower) ||
        (template.descripcion && template.descripcion.toLowerCase().includes(searchTermLower))
      return matchesCategory && matchesSearch
    })
  }, [templates, selectedCategory, searchTerm])

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage)
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTemplates.slice(start, start + itemsPerPage)
  }, [filteredTemplates, currentPage])

  const handleOpenCreate = () => {
    setCurrentTemplate({
      nombre: "",
      categoria: "",
      campos: [],
    })
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (template: FormTemplate) => {
    setCurrentTemplate({ ...template })
    setIsEditModalOpen(true)
  }

  const handleCreateSuccess = async (templateData: FormTemplate) => {
    try {
      const newTemplate = await addTemplate(templateData)
      setIsCreateModalOpen(false)
      setCurrentTemplate(null)
      await loadTemplates()
      setResponseMessage("Plantilla creada con éxito")
    } catch (error: any) {
      console.error("Error al crear plantilla:", error)
      throw error
    }
  }

  const handleEditSuccess = async (templateData: FormTemplate) => {
    try {
      if (!currentTemplate?._id) throw new Error("ID de plantilla no encontrado")

      const updatedTemplate = await editTemplate(currentTemplate._id, templateData)
      setIsEditModalOpen(false)
      setCurrentTemplate(null)
      await loadTemplates()
      setResponseMessage("Plantilla actualizada con éxito")
    } catch (error: any) {
      console.error("Error al actualizar plantilla:", error)
      throw error
    }
  }

  const closeModal = () => setResponseMessage("")

  const handleConfirmDelete = async () => {
    if (!templateToDelete || !templateToDelete._id) return
    try {
      await removeTemplate(templateToDelete._id)
      await loadTemplates()
      setResponseMessage("Plantilla eliminada con éxito")
    } catch (err) {
      console.error("Error al eliminar plantilla", err)
      setResponseMessage("Error al eliminar plantilla")
    } finally {
      setTemplateToDelete(null)
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
      <div className={styles.containerForms}>
        <h1 className={styles.title}>Plantillas de Formularios</h1>
        <div className={styles.positionButton}>
          <Button title="Crear plantilla" onClick={handleOpenCreate} />
        </div>
        <div className={styles.searchContainer}>
          <SearchInput
            placeholder="Buscar por nombre, categoría o descripción"
            showSelect
            selectPlaceholder="Filtrar por categoría"
            selectOptions={[{ label: "Todas", value: "" }, ...categories.map((cat) => ({ label: cat, value: cat }))]}
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
          ) : filteredTemplates.length === 0 ? (
            <p className={styles.loader}>No se encontraron plantillas</p>
          ) : (
            <>
              <div className={styles.templatesGrid}>
                {paginatedTemplates.map((template) => (
                  <div key={template._id} className={styles.templateCard}>
                    <div className={styles.templateHeader}>
                      <h3 className={styles.templateTitle}>{template.nombre}</h3>
                      <span className={styles.templateCategory}>{template.categoria}</span>
                    </div>
                    {template.descripcion && <p className={styles.templateDescription}>{template.descripcion}</p>}
                    <div className={styles.templateStats}>
                      <span>{template.campos.length} campos</span>
                    </div>

                    <div className={styles.cardSeparator}></div>

                    <div className={styles.templateActions}>
                      <button 
                        className={styles.iconButton}
                        onClick={() => handleOpenEdit(template)}
                        aria-label="Editar plantilla"
                        data-tooltip="Editar plantilla"
                      >
                        <Edit size={24} />
                      </button>
                      <button 
                        className={styles.iconButton}
                        onClick={() => {
                          setTemplateToDelete(template)
                          setIsDeleteModalOpen(true)
                        }}
                        aria-label="Eliminar plantilla"
                        data-tooltip="Eliminar plantilla"
                      >
                        <Trash size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

      <ModalCreateForm
        isOpen={isCreateModalOpen}
        onRequestClose={() => {
          setIsCreateModalOpen(false)
          setCurrentTemplate(null)
        }}
        onSubmitSuccess={handleCreateSuccess}
        initialData={currentTemplate}
        categories={categories}
      />

      <ModalEditForm
        isOpen={isEditModalOpen}
        onRequestClose={() => {
          setIsEditModalOpen(false)
          setCurrentTemplate(null)
        }}
        onSubmitSuccess={handleEditSuccess}
        initialData={currentTemplate}
        categories={categories}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar plantilla?"
        description="Esta acción no se puede deshacer. Todos los formularios basados en esta plantilla se verán afectados."
      />

      <ModalSuccess isOpen={!!responseMessage} onRequestClose={closeModal} mensaje={responseMessage} />
    </>
  )
}

export default Forms
