import { useEffect, useMemo, useState } from "react";
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx";
import SearchInput from "../shared/components/Inputs/SearchInput.tsx";
import styles from "../features/manuals/styles/manuals.module.css";
import useManuals, { Manual } from "../features/manuals/hooks/useManuals";
import ModalCreate from "../features/manuals/components/ModalCreate";
import ModalEdit from "../features/manuals/components/ModalEdit";
import ModalSuccess from "../features/manuals/components/ModalSuccess";
import ModalError from "../features/forms/components/ModalError";
import ModalConfirmDelete from "../features/manuals/components/ModalConfirmDelete";
import ModalUploadFile from "../features/manuals/components/ModalUploadFile";
import { Edit, Trash, Upload, FileText, Download, Eye, ArrowLeft, HelpCircle } from 'lucide-react';
import Skeleton from '../shared/components/Skeleton'
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { useManualsTour } from "../features/manuals/hooks/useManualsTour";

const Manuals = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    manuals,
    loading,
    categories,
    addManual,
    editManual,
    removeManual,
    loadManuals,
    updateFile,
  } = useManuals();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [initialData, setInitialData] = useState<Manual | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [manualToDelete, setManualToDelete] = useState<Manual | null>(null);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const role = useAuthStore((s) => s.role)
  const isTechnician = role && ["tecnico", "técnico"].includes(role.toLowerCase())
  const { tourCompleted, startTour, skipTour } = useManualsTour()

  useEffect(() => {
    document.title = t("manuals.titlePage");
  }, [t, i18n.language]);

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted && !isTechnician) {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour, isTechnician]);

  const dynamicCategories = useMemo(() => [
    { label: t('common.all'), value: "" },
    ...categories.map((category) => ({
      label: category,
      value: category,
    })),
  ], [categories, t]);

  const filteredManuals = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    
    return manuals.filter((manual) => {
      if (!manual) return false;
      
      // Normalizar valores de los campos
      const fieldsToSearch = [
        manual.nombre || '',
        manual.descripcion || '',
        manual.autor || '',
        manual.version || '',
        manual.categoria || '',
        manual.idioma || '',
        ...(manual.tags || [])
      ];

      // Verificar coincidencia con categoría
      const matchesCategory = !selectedCategory || manual.categoria === selectedCategory;
      
      // Verificar coincidencia con cualquier campo de búsqueda
      const matchesSearch = fieldsToSearch.some(
        field => field.toLowerCase().includes(searchTermLower)
      );

      return matchesCategory && matchesSearch;
    });
  }, [manuals, selectedCategory, searchTerm]);

  const totalPages = Math.ceil(filteredManuals.length / itemsPerPage);

  const paginatedManuals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredManuals.slice(start, start + itemsPerPage);
  }, [filteredManuals, currentPage]);

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
    setInitialData(null);
  };

  const handleOpenEdit = (manual: Manual) => {
    setInitialData(manual);
    setIsEditModalOpen(true);
  };

  const handleOpenUploadFile = (manual: Manual) => {
    setSelectedManual(manual);
    setIsUploadModalOpen(true);
  };

  const handleSuccessCreateOrEdit = (message: string) => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    loadManuals();
    setResponseMessage(message);
    setIsError(false);
  };

  const handleSuccessUploadFile = async (file: File) => {
    if (!selectedManual || !selectedManual._id) return;
    
    try {
      const result = await updateFile(selectedManual._id, file);
      setIsUploadModalOpen(false);
      loadManuals();
      setResponseMessage(result.message);
      setIsError(false);
    } catch (err: any) {
      console.error("Error al subir archivo:", err);
      setResponseMessage(err.message || t('manuals.errorUploadingFile'));
      setIsError(true);
    }
  };

  const handleError = (message: string) => {
    setResponseMessage(message);
    setIsError(true);
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsUploadModalOpen(false);
  };

  const closeModal = () => {
    setResponseMessage("");
    setIsError(false);
  };

  const handleConfirmDelete = async () => {
    if (!manualToDelete || !manualToDelete._id) return;
    try {
      await removeManual(manualToDelete._id);
      loadManuals();
      setResponseMessage(t('manuals.manualDeleted'));
      setIsError(false);
    } catch (err: any) {
      console.error("Error al eliminar manual", err);
      setResponseMessage(err.message || t('manuals.errorDeletingManual'));
      setIsError(true);
    } finally {
      setManualToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleChangePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleViewFile = (manual: Manual) => {
    if (manual.archivo?.url) {
      window.open(manual.archivo.url, '_blank');
    }
  };

  const handleDownloadFile = (manual: Manual) => {
    if (manual.archivo?.url) {
      const link = document.createElement('a');
      link.href = manual.archivo.url;
      link.download = manual.archivo.nombreOriginal || `${manual.nombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES');
  };

  const translateCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      'Manual de usuario': t('manuals.userManual'),
      'Manual técnico': t('manuals.technicalManual'),
      'Manual de mantenimiento': t('manuals.maintenanceManual'),
      'Guía de instalación': t('manuals.installationGuide'),
      'Otros': t('manuals.others')
    };
    return categoryMap[category] || category;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  return (
    <>
      <div className={styles.containerManuals}>
        <div className={styles.headerContainer}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/activos')}
            aria-label={t('common.backToAssets')}
            data-tour="back-to-assets-btn"
          >
            <ArrowLeft size={20} />
            <span>{t('common.backToAssets')}</span>
          </button>
          <h1 className={styles.title}>{t('manuals.title')}</h1>
        </div>
        {!isTechnician && (
          <div className={styles.positionButton} data-tour="create-manual-btn">
            <Button title={t('manuals.createManual')} onClick={handleOpenCreate} />
          </div>
        )}

        <div className={styles.searchContainer} data-tour="search-filter">
          <SearchInput
            placeholder={t('manuals.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('manuals.filterByCategory')}
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
          ) : filteredManuals.length === 0 ? (
            <p className={styles.loader}>{t('manuals.noManualsFound')}</p>
          ) : (
            <>
              {paginatedManuals.map((manual) => (
                <div key={manual._id} className={styles.manualCard}>
                  <div className={styles.manualInfo}>
                    <div className={styles.manualHeader}>
                      <h3 className={styles.manualTitle}>{manual.nombre}</h3>
                      <span className={styles.manualCategory}>{translateCategory(manual.categoria)}</span>
                    </div>
                    
                    {manual.descripcion && (
                      <p className={styles.manualDescription}>{manual.descripcion}</p>
                    )}
                    
                    <div className={styles.manualDetails}>
                      <div className={styles.detailItem}>
                        <strong>{t('manuals.version')}:</strong> {manual.version || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>{t('manuals.author')}:</strong> {manual.autor || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>{t('manuals.language')}:</strong> {manual.idioma || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>{t('manuals.date')}:</strong> {formatDate(manual.fechaCreacion)}
                      </div>
                    </div>

                    {manual.tags && manual.tags.length > 0 && (
                      <div className={styles.tagsContainer}>
                        {manual.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {manual.archivo && (
                      <div className={styles.fileInfo}>
                        <FileText size={16} />
                        <span>{manual.archivo.nombreOriginal}</span>
                        <span className={styles.fileSize}>
                          ({formatFileSize(manual.archivo.tamaño)})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardSeparator}></div>

                  <div className={styles.cardActions}>
                    {!isTechnician && (
                      <>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenUploadFile(manual)}
                          aria-label={t('manuals.uploadFile')}
                          data-tooltip={t('manuals.uploadUpdateFile')}
                        >
                          <Upload size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleOpenEdit(manual)}
                          aria-label={t('manuals.editManual')}
                          data-tooltip={t('manuals.editManual')}
                        >
                          <Edit size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => {
                            setManualToDelete(manual);
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label={t('manuals.deleteManual')}
                          data-tooltip={t('manuals.deleteManual')}
                        >
                          <Trash size={24} />
                        </button>
                      </>
                    )}
                    {/* Botones de ver y descargar siempre visibles */}
                    {manual.archivo && (
                      <>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleViewFile(manual)}
                          aria-label={t('manuals.viewFile')}
                          data-tooltip={t('manuals.viewFile')}
                        >
                          <Eye size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDownloadFile(manual)}
                          aria-label={t('manuals.downloadFile')}
                          data-tooltip={t('manuals.downloadFile')}
                        >
                          <Download size={24} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div className={styles.pagination}>
                <button
                  onClick={() => handleChangePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  &lt;
                </button>
                <span>
                  {t('manuals.page')} {currentPage} {t('manuals.of')} {totalPages}
                </span>
                <button
                  onClick={() => handleChangePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
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
        onAdd={addManual}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSubmitSuccess={handleSuccessCreateOrEdit}
        onEdit={editManual}
        initialData={initialData}
      />

      <ModalUploadFile
        isOpen={isUploadModalOpen}
        onRequestClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleSuccessUploadFile}
        title={t('manuals.uploadUpdateFile')}
        description={t('manuals.selectPdfFile')}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('manuals.confirmDeleteManual')}
        description={t('manuals.confirmDeleteManualDescription')}
      />

      <ModalSuccess
        isOpen={!!responseMessage}
        onRequestClose={closeModal}
        message={responseMessage}
      />

      <ModalError
        isOpen={!!responseMessage && isError}
        onRequestClose={closeModal}
        mensaje={responseMessage}
      />

      {/* Botón flotante del tour estilo WhatsApp */}
      {!isTechnician && (
        <button
          onClick={tourCompleted ? startTour : skipTour}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--color-secondary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(5, 126, 116, 0.3)',
            transition: 'all 0.3s ease',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 126, 116, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 126, 116, 0.3)';
          }}
          title={tourCompleted ? t('manuals.tour.buttons.restart') : t('manuals.tour.buttons.skip')}
        >
          <HelpCircle size={28} />
        </button>
      )}
    </>
  );
};

export default Manuals;