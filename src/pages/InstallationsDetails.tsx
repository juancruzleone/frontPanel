import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import styles from "../features/installationsDetails/styles/installationDetails.module.css"
import { Trash, Edit, Plus, QrCode, FileText } from "lucide-react"
import ModalAddDevice from "../features/installations/components/ModalAddDevice"
import ModalEditDevice from "../features/installationsDetails/components/ModalEditDevice"
import ModalConfirmDelete from "../features/installations/components/ModalConfirmDelete"
import ModalSuccess from "../features/installations/components/ModalSuccess"
import ModalQRCode from "../features/installationsDetails/components/ModalQrCode"
import useInstallations from "../features/installations/hooks/useInstallations"
import { getLastMaintenanceForDevice } from "../features/installationsDetails/services/installationDetailsServices.ts"
import { updateDeviceInInstallation } from "../features/installations/services/installationServices"
import type { Device } from "../features/installations/hooks/useInstallations"

const InstallationDetails = () => {
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
  const [loadingPDF, setLoadingPDF] = useState<string | null>(null)
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const devicesPerPage = 12

  useEffect(() => {
    if (id) {
      loadInstallationDetails(id)
      document.title = `Dispositivos | LeoneSuite`
    }
  }, [id, loadInstallationDetails])

  // Resetear página cuando cambien los dispositivos
  useEffect(() => {
    setCurrentPage(1)
  }, [installationDevices.length])

  const handleSuccessAddDevice = (message: string) => {
    setIsAddDeviceModalOpen(false)
    setResponseMessage(message)
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
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete?._id || !id) return

    try {
      await removeDeviceFromInstallation(id, deviceToDelete._id)
      setResponseMessage("Dispositivo eliminado con éxito")
    } catch (error) {
      console.error("Error deleting device:", error)
      setResponseMessage("Error al eliminar dispositivo")
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
    } catch (error) {
      console.error("Error downloading maintenance PDF:", error)
      setResponseMessage("Error al descargar el PDF de mantenimiento")
    } finally {
      setLoadingPDF(null)
    }
  }

  const handleRetryLoadAssets = () => {
    loadAssets()
  }

  const closeModal = () => setResponseMessage("")

  // Lógica de paginación
  const totalPages = Math.ceil(installationDevices.length / devicesPerPage)
  const startIndex = (currentPage - 1) * devicesPerPage
  const endIndex = startIndex + devicesPerPage
  const currentDevices = installationDevices.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading && !currentInstallation) {
    return <div className={styles.loader}>Cargando dispositivos...</div>
  }

  if (!currentInstallation) {
    return <div className={styles.loader}>Instalación no encontrada</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dispositivos de {installationName || currentInstallation.company}</h1>
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
            <span>Agregar dispositivo</span>
          </button>
        </div>
      </div>

      <div className={styles.devicesList}>
        {installationDevices.length === 0 ? (
          <p className={styles.emptyMessage}>No hay dispositivos en esta instalación</p>
        ) : (
          currentDevices.map((device, index) => (
            <div key={device._id || `device-${startIndex + index}`} className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <h3>{device.nombre}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <p>
                      <strong>Tipo:</strong> {device.categoria}
                    </p>
                    <p>
                      <strong>Ubicación:</strong> {device.ubicacion}
                    </p>
                    <p>
                      <strong>Estado:</strong>{" "}
                      <span className={styles[device.estado?.replace(/\s/g, "") || ""]}>{device.estado}</span>
                    </p>
                  </div>
                  {(device.marca || device.modelo || device.numeroSerie) && (
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      {device.marca && (
                        <p>
                          <strong>Marca:</strong> {device.marca}
                        </p>
                      )}
                      {device.modelo && (
                        <p>
                          <strong>Modelo:</strong> {device.modelo}
                        </p>
                      )}
                      {device.numeroSerie && (
                        <p>
                          <strong>N° Serie:</strong> {device.numeroSerie}
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
                  aria-label="Ver código QR"
                  data-tooltip="Ver código QR"
                >
                  <QrCode size={18} />
                </button>
                <button
                  className={styles.pdfButton}
                  onClick={() => handleDownloadLastMaintenancePDF(device)}
                  disabled={loadingPDF === device._id}
                  aria-label="Descargar último mantenimiento"
                  data-tooltip="Descargar último mantenimiento"
                >
                  <FileText size={18} />
                </button>
                <button 
                  className={styles.editButton} 
                  onClick={() => handleEditDevice(device)}
                  aria-label="Editar dispositivo"
                  data-tooltip="Editar dispositivo"
                >
                  <Edit size={18} />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    setDeviceToDelete(device)
                    setIsDeleteModalOpen(true)
                  }}
                  aria-label="Eliminar dispositivo"
                  data-tooltip="Eliminar dispositivo"
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
            Página {currentPage} de {totalPages}
          </span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            &gt;
          </button>
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
        title="¿Eliminar dispositivo?"
        description="Esta acción no se puede deshacer."
      />

      <ModalQRCode
        isOpen={isQRModalOpen}
        onRequestClose={() => setIsQRModalOpen(false)}
        device={deviceForQR}
        installation={currentInstallation}
      />

      <ModalSuccess isOpen={!!responseMessage} onRequestClose={closeModal} mensaje={responseMessage} />
    </div>
  )
}

export default InstallationDetails
