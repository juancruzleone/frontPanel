import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import styles from "../features/installationsDetails/styles/installationDetails.module.css"
import { Trash, Edit, Plus, QrCode, FileText, HelpCircle } from "lucide-react"
import { FiArrowLeft } from "react-icons/fi"
import { useTheme } from "../shared/hooks/useTheme"
import ModalAddDevice from "../features/installations/components/ModalAddDevice"
import ModalEditDevice from "../features/installationsDetails/components/ModalEditDevice"
import ModalConfirmDelete from "../features/installations/components/ModalConfirmDelete"
import ModalSuccess from "../features/installations/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalQRCode from "../features/installationsDetails/components/ModalQrCode"
import useInstallations from "../features/installations/hooks/useInstallations"
import { getLastMaintenanceForDevice } from "../features/installationsDetails/services/installationDetailsServices.ts"
import { updateDeviceInInstallation } from "../features/installations/services/installationServices"
import type { Device } from "../features/installations/hooks/useInstallations"
import { useTranslation } from "react-i18next"
import { translateDeviceStatus } from "../shared/utils/backendTranslations"
import SearchInput from "../shared/components/Inputs/SearchInput"
import HybridSelect from "../shared/components/HybridSelect/HybridSelect"
import { useInstallationDetailTour } from "../features/installationsDetails/hooks/useInstallationDetailTour"
import { useAuthStore } from "../store/authStore"

const InstallationDetails = () => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { installationName } = location.state || { installationName: "" }
  const role = useAuthStore((s) => s.role)
  const isTechnicalUser = role && ["tecnico", "técnico"].includes(role.toLowerCase())
  const { tourCompleted, startTour, resetTour, skipTour } = useInstallationDetailTour()

  // Opciones de estado para el filtro
  const statusOptions = [
    { value: "", label: t('common.all') },
    { value: "Activo", label: t('installations.deviceStatus.active') },
    { value: "Inactivo", label: t('installations.deviceStatus.inactive') },
    { value: "En mantenimiento", label: t('installations.deviceStatus.maintenance') },
    { value: "Fuera de servicio", label: t('installations.deviceStatus.outOfService') },
    { value: "Pendiente de revisión", label: t('installations.deviceStatus.pendingReview') },
  ]

  const {
    currentInstallation,
    installationDevices,
    assets,
    loading,
    loadingAssets,
    errorLoadingAssets,
    loadInstallationDetails,
    refreshInstallationDevices,
    loadAssets,
    addDeviceToInstallation,
    removeDeviceFromInstallation,
  } = useInstallations()

  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false)
  const [isEditDeviceModalOpen, setIsEditDeviceModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null)
  const [deviceForQR, setDeviceForQR] = useState<Device | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Estado para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const devicesPerPage = 4

  // Filtrar dispositivos por término de búsqueda y estado
  const filteredDevices = useMemo(() => {
    let filtered = installationDevices

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(device => 
        device.nombre?.toLowerCase().includes(term) ||
        device.ubicacion?.toLowerCase().includes(term) ||
        device.categoria?.toLowerCase().includes(term)
      )
    }

    // Filtrar por estado
    if (selectedStatus) {
      filtered = filtered.filter(device => device.estado === selectedStatus)
    }

    return filtered
  }, [installationDevices, searchTerm, selectedStatus])

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredDevices.length / devicesPerPage)
  const startIndex = (currentPage - 1) * devicesPerPage
  const currentDevices = filteredDevices.slice(startIndex, startIndex + devicesPerPage)

  // Debug: Log para verificar la paginación
  console.log('Paginación debug:', {
    totalDevices: installationDevices.length,
    devicesPerPage,
    totalPages,
    currentPage,
    startIndex,
    currentDevicesLength: currentDevices.length
  })

  useEffect(() => {
    if (id) {
      loadInstallationDetails(id).finally(() => {
        setInitialLoad(false)
      })
      document.title = t("installationDetails.titlePage")
    }
  }, [id, loadInstallationDetails, t])

  // Iniciar el tour automáticamente si no se ha completado
  useEffect(() => {
    if (!loading && !tourCompleted && !isTechnicalUser) {
      // Esperar un poco para que el DOM se cargue completamente
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour, isTechnicalUser])

  // Resetear página cuando cambien los dispositivos, el término de búsqueda o el filtro de estado
  useEffect(() => {
    setCurrentPage(1)
  }, [installationDevices.length, searchTerm, selectedStatus])

  const handleSuccessAddDevice = (message: string) => {
    setIsAddDeviceModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
    // Refrescar la lista de dispositivos después de agregar
    if (id) {
      refreshInstallationDevices(id)
    }
  }

  const handleUpdateDevice = async (installationId: string, deviceId: string, deviceData: Partial<Device>) => {
    try {
      const result = await updateDeviceInInstallation(installationId, deviceId, deviceData)
      return { message: "Dispositivo actualizado con éxito" }
    } catch (err: any) {
      console.error("Error al actualizar dispositivo:", err)
      throw err
    }
  }

  const handleSuccessUpdateDevice = (message: string) => {
    setIsEditDeviceModalOpen(false)
    setDeviceToEdit(null)
    setResponseMessage(message)
    setIsError(false)
    // Refrescar la lista de dispositivos después de actualizar
    if (id) {
      refreshInstallationDevices(id)
    }
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete?._id || !id) return

    try {
      await removeDeviceFromInstallation(id, deviceToDelete._id)
      setResponseMessage("Dispositivo eliminado con éxito")
      setIsError(false)
    } catch (error: any) {
      console.error("Error deleting device:", error)
      setResponseMessage(error.message || "Error al eliminar dispositivo")
      setIsError(true)
    } finally {
      setIsDeleteModalOpen(false)
      setDeviceToDelete(null)
    }
  }

  const handleEditDevice = (device: Device) => {
    setDeviceToEdit(device)
    setIsEditDeviceModalOpen(true)
  }

  const handleShowQR = (device: Device) => {
    setDeviceForQR(device)
    setIsQRModalOpen(true)
  }

  const handleDownloadLastMaintenancePDF = async (device: Device) => {
    if (!device._id || !id) return

    setLoadingPDF(device._id)
    try {
      const maintenanceData = await getLastMaintenanceForDevice(id, device._id)

      if (!maintenanceData || !maintenanceData.pdfUrl) {
        setResponseMessage("No hay registros de mantenimiento para este dispositivo")
        setIsError(true)
        return
      }

      // Crear un enlace temporal para descargar el PDF
      const link = document.createElement("a")
      link.href = maintenanceData.pdfUrl
      link.download = `mantenimiento_${device.nombre}_${new Date().toISOString().split("T")[0]}.pdf`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setResponseMessage("Descargando PDF del último mantenimiento...")
      setIsError(false)
    } catch (error: any) {
      console.error("Error downloading maintenance PDF:", error)
      setResponseMessage(error.message || "Error al descargar el PDF de mantenimiento")
      setIsError(true)
    } finally {
      setLoadingPDF(null)
    }
  }

  const handleRetryLoadAssets = () => {
    loadAssets()
  }

  const closeModal = () => {
    setResponseMessage("")
    setIsError(false)
  }

  // Lógica de paginación
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleGoBack = () => {
    navigate("/instalaciones")
  }

  if (loading || initialLoad) {
    return <div className={styles.loader}>{t("installationDetails.loadingDevices")}</div>
  }

  if (!loading && !currentInstallation && !initialLoad) {
    return <div className={styles.loader}>{t("installationDetails.notFound")}</div>
  }

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <button 
          onClick={handleGoBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            width: '36px',
            height: '36px'
          }}
          title={t('common.back')}
        >
          <FiArrowLeft size={20} />
        </button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>{t("installationDetails.devicesOf", { name: installationName || currentInstallation.company })}</h1>
        <p className={styles.address}>
          {currentInstallation.address}, {currentInstallation.city}, {currentInstallation.province}
        </p>
        {currentInstallation.installationType && (
          <span className={styles.installationTypeTag}>
            {currentInstallation.installationType}
          </span>
        )}
        <div className={styles.actions}>
          <button className={styles.addButton} onClick={() => setIsAddDeviceModalOpen(true)} data-tour="add-device-btn">
            <Plus size={20} />
            <span>{t("installationDetails.addDevice")}</span>
          </button>
        </div>
      </div>

      <div className={styles.searchContainer} data-tour="search-filter-devices">
        <div className={styles.filterContainer}>
          <HybridSelect
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value)}
            options={statusOptions}
            placeholder={t('common.all')}
          />
        </div>
        <SearchInput
          placeholder={t('installationDetails.searchDevicesPlaceholder')}
          onInputChange={(value) => setSearchTerm(value)}
        />
      </div>

      <div className={styles.devicesList}>
        {filteredDevices.length === 0 ? (
          <p className={styles.emptyMessage}>
            {searchTerm.trim() || selectedStatus ? t("installationDetails.noDevicesFound") : t("installationDetails.noDevices")}
          </p>
        ) : (
          currentDevices.map((device, index) => (
            <div key={device._id || `device-${startIndex + index}`} className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <h3>{device.nombre}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <p>
                      <strong>{t("installationDetails.type")}:</strong> {device.categoria}
                    </p>
                    <p>
                      <strong>{t("installationDetails.location")}:</strong> {device.ubicacion}
                    </p>
                    <p>
                      <strong>{t("installationDetails.status")}:</strong>{" "}
                      <span className={styles[device.estado?.replace(/\s/g, "") || ""]}>{translateDeviceStatus(device.estado)}</span>
                    </p>
                  </div>
                  {(device.marca || device.modelo || device.numeroSerie) && (
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      {device.marca && (
                        <p>
                          <strong>{t("installationDetails.brand")}:</strong> {device.marca}
                        </p>
                      )}
                      {device.modelo && (
                        <p>
                          <strong>{t("installationDetails.model")}:</strong> {device.modelo}
                        </p>
                      )}
                      {device.numeroSerie && (
                        <p>
                          <strong>{t("installationDetails.serialNumber")}:</strong> {device.numeroSerie}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.cardSeparator}></div>

              <div className={styles.deviceActions}>
                <button 
                  className={styles.qrButton} 
                  onClick={() => handleShowQR(device)} 
                  aria-label={t("installationDetails.seeQR")}
                  data-tooltip={t("installationDetails.seeQR")}
                >
                  <QrCode size={18} />
                </button>
                <button
                  className={styles.pdfButton}
                  onClick={() => handleDownloadLastMaintenancePDF(device)}
                  disabled={loadingPDF === device._id}
                  aria-label={t("installationDetails.downloadLastMaintenance")}
                  data-tooltip={t("installationDetails.downloadLastMaintenance")}
                >
                  <FileText size={18} />
                </button>
                <button 
                  className={styles.editButton} 
                  onClick={() => handleEditDevice(device)}
                  aria-label={t("installationDetails.editDevice")}
                  data-tooltip={t("installationDetails.editDevice")}
                >
                  <Edit size={18} />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    setDeviceToDelete(device)
                    setIsDeleteModalOpen(true)
                  }}
                  aria-label={t("installationDetails.deleteDevice")}
                  data-tooltip={t("installationDetails.deleteDevice")}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {installationDevices.length > devicesPerPage && (
        <div className={styles.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            &lt;
          </button>
          <span>
            {t('installationDetails.page')} {currentPage} {t('installationDetails.of')} {totalPages}
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            &gt;
          </button>
        </div>
      )}
      
      {/* Información adicional cuando hay paginación */}
      {installationDevices.length > devicesPerPage && (
        <div style={{ textAlign: 'center', marginTop: '8px', color: 'var(--color-text)', opacity: 0.7, fontSize: '14px' }}>
          Mostrando {startIndex + 1}-{Math.min(startIndex + devicesPerPage, installationDevices.length)} de {installationDevices.length} dispositivos
        </div>
      )}

      <ModalAddDevice
        isOpen={isAddDeviceModalOpen}
        onRequestClose={() => setIsAddDeviceModalOpen(false)}
        onSubmitSuccess={handleSuccessAddDevice}
        onAddDevice={addDeviceToInstallation}
        installation={currentInstallation}
        assets={assets}
        loadingAssets={loadingAssets}
        errorLoadingAssets={errorLoadingAssets}
        onRetryLoadAssets={handleRetryLoadAssets}
        loadAssets={loadAssets}
      />

      <ModalEditDevice
        isOpen={isEditDeviceModalOpen}
        onRequestClose={() => setIsEditDeviceModalOpen(false)}
        onSubmitSuccess={handleSuccessUpdateDevice}
        onUpdateDevice={handleUpdateDevice}
        device={deviceToEdit}
        installation={currentInstallation}
        assets={assets}
        loadingAssets={loadingAssets}
        errorLoadingAssets={errorLoadingAssets}
        onRetryLoadAssets={handleRetryLoadAssets}
        loadAssets={loadAssets}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDevice}
        title={t("installationDetails.confirmDeleteTitle")}
        description={t("installationDetails.confirmDeleteDescription")}
      />

      <ModalQRCode
        isOpen={isQRModalOpen}
        onRequestClose={() => setIsQRModalOpen(false)}
        device={deviceForQR}
        installation={currentInstallation}
      />

              <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
        <ModalError isOpen={!!responseMessage && isError} onRequestClose={closeModal} mensaje={responseMessage} />

      {/* Botón flotante del tour estilo WhatsApp */}
      {!isTechnicalUser && (
        <button
          onClick={tourCompleted ? startTour : skipTour}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-secondary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(5, 126, 116, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1000,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 126, 116, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 126, 116, 0.3)'
          }}
          title={tourCompleted ? t('installationDetails.tour.buttons.restart') : t('installationDetails.tour.buttons.skip')}
        >
          <HelpCircle size={28} />
        </button>
      )}
    </div>
  )
}

export default InstallationDetails
