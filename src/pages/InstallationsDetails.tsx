import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import styles from "../features/installationsDetails/styles/installationDetails.module.css"
import { Trash, Edit, Plus, QrCode, FileText } from "lucide-react"
import { FiArrowLeft } from "react-icons/fi"
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

const InstallationDetails = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { installationName } = location.state || { installationName: "" }

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
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const devicesPerPage = 4

  // Cálculos de paginación
  const totalPages = Math.ceil(installationDevices.length / devicesPerPage)
  const startIndex = (currentPage - 1) * devicesPerPage
  const currentDevices = installationDevices.slice(startIndex, startIndex + devicesPerPage)

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
      loadInstallationDetails(id)
      document.title = t("installationDetails.titlePage")
    }
  }, [id, loadInstallationDetails, t])

  // Resetear página cuando cambien los dispositivos
  useEffect(() => {
    setCurrentPage(1)
  }, [installationDevices.length])

  const handleSuccessAddDevice = (message: string) => {
    setIsAddDeviceModalOpen(false)
    setResponseMessage(message)
    setIsError(false)
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

  if (loading && !currentInstallation) {
    return <div className={styles.loader}>{t("installationDetails.loadingDevices")}</div>
  }

  if (!currentInstallation) {
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
          <button className={styles.addButton} onClick={() => setIsAddDeviceModalOpen(true)}>
            <Plus size={20} />
            <span>{t("installationDetails.addDevice")}</span>
          </button>
        </div>
      </div>

      <div className={styles.devicesList}>
        {installationDevices.length === 0 ? (
          <p className={styles.emptyMessage}>{t("installationDetails.noDevices")}</p>
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
    </div>
  )
}

export default InstallationDetails
