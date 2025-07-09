import { useEffect, useMemo, useState } from "react";
import Button from "../../src/shared/components/Buttons/buttonCreate.tsx";
import SearchInput from "../shared/components/Inputs/SearchInput.tsx";
import styles from "../features/manuals/styles/manuals.module.css";
import useManuals, { Manual } from "../features/manuals/hooks/useManuals";
import ModalCreate from "../features/manuals/components/ModalCreate";
import ModalEdit from "../features/manuals/components/ModalEdit";
import ModalSuccess from "../features/manuals/components/ModalSuccess";
import ModalConfirmDelete from "../features/manuals/components/ModalConfirmDelete";
import ModalUploadFile from "../features/manuals/components/ModalUploadFile";
import { Edit, Trash, Upload, FileText, Download, Eye } from 'lucide-react';
import Skeleton from '../shared/components/Skeleton'

const Manuals = () => {
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
  const [manualToDelete, setManualToDelete] = useState<Manual | null>(null);
  const [selectedManual, setSelectedManual] = useState<Manual | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    document.title = "Manuales | LeoneSuite";
  }, []);

  const dynamicCategories = useMemo(() => [
    { label: "Todas", value: "" },
    ...categories.map((category) => ({
      label: category,
      value: category,
    })),
  ], [categories]);

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
  };

  const handleSuccessUploadFile = async (file: File) => {
    if (!selectedManual || !selectedManual._id) return;
    
    try {
      const result = await updateFile(selectedManual._id, file);
      setIsUploadModalOpen(false);
      loadManuals();
      setResponseMessage(result.message);
    } catch (err: any) {
      console.error("Error al subir archivo:", err);
      setResponseMessage("Error al subir archivo");
    }
  };

  const closeModal = () => setResponseMessage("");

  const handleConfirmDelete = async () => {
    if (!manualToDelete || !manualToDelete._id) return;
    try {
      await removeManual(manualToDelete._id);
      loadManuals();
      setResponseMessage("Manual eliminado con éxito");
    } catch (err) {
      console.error("Error al eliminar manual", err);
      setResponseMessage("Error al eliminar manual");
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  return (
    <>
      <div className={styles.containerManuals}>
        <h1 className={styles.title}>Manuales</h1>
        <div className={styles.positionButton}>
          <Button title="Crear manual" onClick={handleOpenCreate} />
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            placeholder="Buscar por nombre, descripción, autor, versión o tags"
            showSelect
            selectPlaceholder="Filtrar por categoría"
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
            <p className={styles.loader}>No se encontraron manuales</p>
          ) : (
            <>
              {paginatedManuals.map((manual) => (
                <div key={manual._id} className={styles.manualCard}>
                  <div className={styles.manualInfo}>
                    <div className={styles.manualHeader}>
                      <h3 className={styles.manualTitle}>{manual.nombre}</h3>
                      <span className={styles.manualCategory}>{manual.categoria}</span>
                    </div>
                    
                    {manual.descripcion && (
                      <p className={styles.manualDescription}>{manual.descripcion}</p>
                    )}
                    
                    <div className={styles.manualDetails}>
                      <div className={styles.detailItem}>
                        <strong>Versión:</strong> {manual.version || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>Autor:</strong> {manual.autor || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>Idioma:</strong> {manual.idioma || 'N/A'}
                      </div>
                      <div className={styles.detailItem}>
                        <strong>Fecha:</strong> {formatDate(manual.fechaCreacion)}
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
                    <button
                      className={styles.iconButton}
                      onClick={() => handleOpenUploadFile(manual)}
                      aria-label="Subir archivo"
                      data-tooltip="Subir/Actualizar archivo"
                    >
                      <Upload size={24} />
                    </button>
                    
                    {manual.archivo && (
                      <>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleViewFile(manual)}
                          aria-label="Ver archivo"
                          data-tooltip="Ver archivo"
                        >
                          <Eye size={24} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDownloadFile(manual)}
                          aria-label="Descargar archivo"
                          data-tooltip="Descargar archivo"
                        >
                          <Download size={24} />
                        </button>
                      </>
                    )}
                    
                    <button
                      className={styles.iconButton}
                      onClick={() => handleOpenEdit(manual)}
                      aria-label="Editar manual"
                      data-tooltip="Editar manual"
                    >
                      <Edit size={24} />
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={() => {
                        setManualToDelete(manual);
                        setIsDeleteModalOpen(true);
                      }}
                      aria-label="Eliminar manual"
                      data-tooltip="Eliminar manual"
                    >
                      <Trash size={24} />
                    </button>
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
                  Página {currentPage} de {totalPages}
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
        title="Subir/Actualizar Archivo PDF"
        description="Seleccione un archivo PDF para el manual"
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar manual?"
        description="Esta acción eliminará el manual y su archivo asociado. No se puede deshacer."
      />

      <ModalSuccess
        isOpen={!!responseMessage}
        onRequestClose={closeModal}
        message={responseMessage}
      />
    </>
  );
};

export default Manuals;