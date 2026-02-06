import { useEffect, useMemo, useState, useCallback } from "react"
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
import { Edit, Trash, HelpCircle, FilterX } from "lucide-react"
import type { FormTemplate } from "../features/forms/hooks/useForms"
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next"
import { translateFormFieldType } from "../shared/utils/backendTranslations"
import { useLocation } from "react-router-dom"
import { useAssetsTour } from "../features/assets/hooks/useAssetsTour"
import { useFormsTour } from "../features/forms/hooks/useFormsTour"
import TourButton from "../shared/components/Buttons/TourButton"

const Forms = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { continueFormsTour } = useAssetsTour()
  const { tourCompleted, startTour, skipTour } = useFormsTour()
  const {
    templates,
    pagination,
    loading,
    categories,
    loadTemplates,
    loadCategories,
    addTemplate,
    editTemplate,
    removeTemplate
  } = useForms()

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

  const itemsPerPage = 5

  useEffect(() => {
    document.title = t("forms.titlePage")
  }, [t, i18n.language])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted && !location.state?.fromAssetsTour) {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour, location.state])

  // Continuar el tour si venimos de activos
  useEffect(() => {
    if (location.state?.fromAssetsTour) {
      const timer = setTimeout(() => {
        continueFormsTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [location.state, continueFormsTour])

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
      await addTemplate(templateData)
      setIsCreateModalOpen(false)
      loadTemplates({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
      setResponseMessage(t("forms.createSuccess"))
      setIsError(false)
    } catch (err: any) {
      setResponseMessage(err.message || t("forms.createError"))
      setIsError(true)
    }
  }

  const handleEditSuccess = async (templateData: FormTemplate) => {
    if (!currentTemplate?._id) return
    try {
      await editTemplate(currentTemplate._id, templateData)
      setIsEditModalOpen(false)
      loadTemplates({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
      setResponseMessage(t("forms.editSuccess"))
      setIsError(false)
    } catch (err: any) {
      setResponseMessage(err.message || t("forms.editError"))
      setIsError(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (templateToDelete?._id) {
      try {
        await removeTemplate(templateToDelete._id)
        loadTemplates({ page: pagination.page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
        setResponseMessage(t("forms.deleteSuccess"))
        setIsError(false)
      } catch (err: any) {
        setResponseMessage(err.message || t("forms.deleteError"))
        setIsError(true)
      } finally {
        setIsDeleteModalOpen(false)
        setTemplateToDelete(null)
      }
    }
  }

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadTemplates({ page, limit: itemsPerPage, search: searchTerm, category: selectedCategory })
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadTemplates({ page: 1, limit: itemsPerPage, search: value, category: selectedCategory })
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    loadTemplates({ page: 1, limit: itemsPerPage, search: searchTerm, category: value })
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  const dynamicCategories = useMemo(
    () => [
      { label: t("common.all"), value: "" },
      ...categories.map((cat) => ({ label: cat, value: cat })),
    ],
    [categories, t],
  )

  return (
    <>
      <div className={styles.containerForms}>
        <div className={styles.topSection}>
          <h1 className={styles.title}>{t("forms.title")}</h1>
          <div className={styles.positionButton}>
            <Button title={t("forms.createTemplate")} onClick={handleOpenCreate} data-tour="create-template-btn" />
          </div>
        </div>

        <div className={styles.typeButtons}>
          <button
            className={styles.smallButton}
            onClick={() => setIsCreateCategoryModalOpen(true)}
            data-tour="create-category-btn"
          >
            {t("forms.createCategory")}
          </button>
          <button
            className={styles.manageButton}
            onClick={() => setIsManageCategoriesModalOpen(true)}
            data-tour="manage-categories-btn"
          >
            {t("forms.manageCategories")}
          </button>
        </div>

        <div className={styles.searchRow}>
          <div className={styles.searchContainerInner} data-tour="search-filter">
            <SearchInput
              placeholder={t("forms.searchPlaceholder")}
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
              loadTemplates({ page: 1, limit: itemsPerPage, search: "", category: "" })
            }}
            className={styles.clearFilters}
            title={t('calendar.clearFilters')}
          >
            <FilterX size={20} />
          </button>
        </div>

        <div className={styles.listContainer}>
          {loading ? (
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <Skeleton key={i} height={120} width={"100%"} style={{ borderRadius: 14 }} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <p className={styles.noData}>{t("forms.noTemplatesFound")}</p>
          ) : (
            <>
              <div className={styles.templatesGrid}>
                {templates.map((template) => (
                  <div key={template._id} className={styles.templateCard}>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.templateName}>{template.nombre}</h3>
                      <span className={styles.templateCategory}>{template.categoria}</span>
                      <p className={styles.templateDesc}>{template.descripcion}</p>
                      <div className={styles.fieldTags}>
                        {template.campos.slice(0, 3).map((campo, idx) => (
                          <span key={idx} className={styles.fieldTag}>
                            {translateFormFieldType(campo.type, t)}
                          </span>
                        ))}
                        {template.campos.length > 3 && (
                          <span className={styles.moreFields}>+{template.campos.length - 3}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardSeparator}></div>

                    <div className={styles.cardActions}>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenEdit(template)}
                          aria-label={t('forms.editTemplate')}
                          data-tooltip={t('forms.editTemplate')}
                          data-tour="edit-template-btn"
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
                          data-tour="delete-template-btn"
                        >
                          <Trash size={24} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.pagination}>
                <button onClick={() => handleChangePage(pagination.page - 1)} disabled={pagination.page === 1}>
                  &lt;
                </button>
                <span>
                  {t("forms.page")} {pagination.page} {t("forms.of")} {pagination.totalPages}
                </span>
                <button onClick={() => handleChangePage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                  &gt;
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ModalCreateForm
        isOpen={isCreateModalOpen}
        onRequestClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={handleCreateSuccess}
        onSubmitError={(msg) => {
          setResponseMessage(msg)
          setIsError(true)
        }}
        initialData={null}
        categories={categories}
      />

      <ModalEditForm
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={handleEditSuccess}
        initialData={currentTemplate}
        categories={categories}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("forms.confirmDeleteTitle")}
        description={t("forms.confirmDeleteDescription", { name: templateToDelete?.nombre })}
      />

      <ModalCreateFormCategory
        isOpen={isCreateCategoryModalOpen}
        onRequestClose={() => setIsCreateCategoryModalOpen(false)}
        onSubmitSuccess={() => {
          loadCategories()
          setResponseMessage(t("forms.categoryCreateSuccess"))
          setIsError(false)
        }}
      />

      <ModalManageCategories
        isOpen={isManageCategoriesModalOpen}
        onRequestClose={() => setIsManageCategoriesModalOpen(false)}
        onCategoriesChange={loadCategories}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={closeModal} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      <TourButton
        onClick={tourCompleted ? startTour : skipTour}
        label={tourCompleted ? t('forms.tour.buttons.restart') : t('forms.tour.buttons.skip')}
      />
    </>
  )
}

export default Forms
