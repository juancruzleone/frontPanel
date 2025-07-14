import { useEffect, useMemo, useState } from "react"
import Button from "../../src/shared/components/Buttons/buttonCreate"
import SearchInput from "../shared/components/Inputs/SearchInput"
import styles from "../features/forms/styles/forms.module.css"
import useForms from "../features/forms/hooks/useForms"
import ModalCreateForm from "../features/forms/components/ModalCreateForm"
import ModalEditForm from "../features/forms/components/ModalEditForm"
import ModalSuccess from "../features/forms/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalConfirmDelete from "../features/forms/components/ModalConfirmDelete"
import ModalCreateFormCategory from "../features/forms/components/ModalCreateFormCategory"
import ModalManageCategories from "../features/forms/components/ModalManageCategories"
import { Edit, Trash } from "lucide-react"
import type { FormTemplate } from "../features/forms/hooks/useForms"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { translateFormFieldType } from "../shared/utils/backendTranslations"

const Forms = () => {
  const { t } = useTranslation()
  const { templates, loading, categories, loadTemplates, addTemplate, editTemplate, removeTemplate } = useForms()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false)
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
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
      setResponseMessage(t('forms.templateCreated'))
      setIsError(false)
    } catch (error: any) {
      console.error("Error al crear plantilla:", error)
      setResponseMessage(error.message || t('forms.errorCreatingTemplate'))
      setIsError(true)
    }
  }

  const handleEditSuccess = async (templateData: FormTemplate) => {
    try {
      if (!currentTemplate?._id) throw new Error("ID de plantilla no encontrado")

      const updatedTemplate = await editTemplate(currentTemplate._id, templateData)
      setIsEditModalOpen(false)
      setCurrentTemplate(null)
      await loadTemplates()
      setResponseMessage(t('forms.templateUpdated'))
      setIsError(false)
    } catch (error: any) {
      console.error("Error al actualizar plantilla:", error)
      setResponseMessage(error.message || t('forms.errorUpdatingTemplate'))
      setIsError(true)
    }
  }

  const handleSuccessCreateCategory = (message: string) => {
    setIsCreateCategoryModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
  }

  const handleSuccessManageCategories = (message: string) => {
    setIsManageCategoriesModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete || !templateToDelete._id) return
    try {
      await removeTemplate(templateToDelete._id)
      await loadTemplates()
      setResponseMessage(t('forms.templateDeleted'))
      setIsError(false)
    } catch (err: any) {
      console.error("Error al eliminar plantilla", err)
      setResponseMessage(err.message || t('forms.errorDeletingTemplate'))
      setIsError(true)
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
        <h1 className={styles.title}>{t('forms.title')}</h1>
        <div className={styles.positionButton}>
          <Button title={t('forms.createTemplate')} onClick={handleOpenCreate} />
        </div>
        
        <div className={styles.typeButtons}>
          <button className={styles.smallButton} onClick={() => setIsCreateCategoryModalOpen(true)}>
            + {t('forms.createFormCategory')}
          </button>
          <button className={styles.manageButton} onClick={() => setIsManageCategoriesModalOpen(true)}>
            📋 {t('forms.viewCreatedCategories')}
          </button>
        </div>
        
        <div className={styles.searchContainer}>
          <SearchInput
            placeholder={t('forms.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('forms.filterByCategory')}
            selectOptions={[{ label: t('common.all'), value: "" }, ...categories.map((cat) => ({ label: cat, value: cat }))]}
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
            <p className={styles.loader}>{t('forms.noTemplatesFound')}</p>
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
                      <span>{template.campos.length} {t('forms.fields')}</span>
                      {template.campos.length > 0 && (
                        <div className={styles.fieldTypes}>
                          <span>{t('forms.fieldTypes')}: </span>
                          {template.campos.slice(0, 3).map((campo, index) => (
                            <span key={index} className={styles.fieldType}>
                              {translateFormFieldType(campo.type)}
                              {index < Math.min(template.campos.length, 3) - 1 && ", "}
                            </span>
                          ))}
                          {template.campos.length > 3 && (
                            <span className={styles.moreFields}> +{template.campos.length - 3} {t('forms.more')}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.cardSeparator}></div>

                    <div className={styles.templateActions}>
                      <button 
                        className={styles.iconButton}
                        onClick={() => handleOpenEdit(template)}
                        aria-label={t('forms.editTemplate')}
                        data-tooltip={t('forms.editTemplate')}
                      >
                        <Edit size={24} />
                      </button>
                      <button 
                        className={styles.iconButton}
                        onClick={() => {
                          setTemplateToDelete(template)
                          setIsDeleteModalOpen(true)
                        }}
                        aria-label={t('forms.deleteTemplate')}
                        data-tooltip={t('forms.deleteTemplate')}
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
                  {t('forms.page')} {currentPage} {t('forms.of')} {totalPages}
                </span>
                <button onClick={() => handleChangePage(currentPage + 1)} disabled={currentPage === totalPages}>
                  &gt;
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <ModalCreateForm
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={handleCreateSuccess}
        onSubmitError={(message: string) => {
          setResponseMessage(message)
          setIsError(true)
        }}
        initialData={currentTemplate}
        categories={categories}
      />

      <ModalEditForm
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={handleEditSuccess}
        initialData={currentTemplate}
        categories={categories}
      />

      <ModalCreateFormCategory
        isOpen={isCreateCategoryModalOpen}
        onRequestClose={() => setIsCreateCategoryModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateCategory}
      />

      <ModalManageCategories
        isOpen={isManageCategoriesModalOpen}
        onRequestClose={() => setIsManageCategoriesModalOpen(false)}
        onCategoryCreated={handleSuccessManageCategories}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('forms.deleteTemplate')}
        description={t('forms.confirmDeleteTemplate')}
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

export default Forms
