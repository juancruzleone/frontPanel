"use client"

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
    loadAssets,
    addDeviceToInstallation,
    updateDeviceInInstallation,
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

  useEffect(() => {
    if (id) {
      loadInstallationDetails(id)
      document.title = `Dispositivos | LeoneSuite`
    }
  }, [id, loadInstallationDetails])

  const handleAddDevice = async (device: Device) => {
    try {
      if (!id) return
      const result = await addDeviceToInstallation(id, device)
      setResponseMessage(result.message)
      setIsAddDeviceModalOpen(false)
      loadInstallationDetails(id)
    } catch (error) {
      console.error("Error adding device:", error)
      setResponseMessage("Error al agregar dispositivo")
    }
  }

  const handleUpdateDevice = async (installationId: string, deviceId: string, deviceData: Partial<Device>) => {
    try {
      const result = await updateDeviceInInstallation(installationId, deviceId, deviceData)
      setResponseMessage(result.message)
      setIsEditDeviceModalOpen(false)
      setDeviceToEdit(null)
      loadInstallationDetails(installationId)
      return result
    } catch (error) {
      console.error("Error updating device:", error)
      throw error
    }
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete?._id || !id) return

    try {
      await removeDeviceFromInstallation(id, deviceToDelete._id)
      setResponseMessage("Dispositivo eliminado con éxito")
      loadInstallationDetails(id)
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
          installationDevices.map((device) => (
            <div key={device._id} className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <h3>{device.nombre}</h3>
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
              <div className={styles.deviceActions}>
                <button className={styles.qrButton} onClick={() => handleShowQR(device)} title="Ver código QR">
                  <QrCode size={18} />
                </button>
                <button
                  className={styles.pdfButton}
                  onClick={() => handleDownloadLastMaintenancePDF(device)}
                  disabled={loadingPDF === device._id}
                  title="Descargar último mantenimiento"
                >
                  <FileText size={18} />
                </button>
                <button className={styles.editButton} onClick={() => handleEditDevice(device)}>
                  <Edit size={18} />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => {
                    setDeviceToDelete(device)
                    setIsDeleteModalOpen(true)
                  }}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ModalAddDevice
        isOpen={isAddDeviceModalOpen}
        onRequestClose={() => setIsAddDeviceModalOpen(false)}
        onSubmitSuccess={(message) => setResponseMessage(message)}
        onAddDevice={handleAddDevice}
        installation={currentInstallation}
        assets={assets}
        loadingAssets={loadingAssets}
        errorLoadingAssets={errorLoadingAssets}
        onRetryLoadAssets={handleRetryLoadAssets}
        loadAssets={loadAssets}
      />

      <ModalEditDevice
        isOpen={isEditDeviceModalOpen}
        onRequestClose={() => {
          setIsEditDeviceModalOpen(false)
          setDeviceToEdit(null)
        }}
        onSubmitSuccess={(message) => setResponseMessage(message)}
        onUpdateDevice={handleUpdateDevice}
        installation={currentInstallation}
        device={deviceToEdit}
        assets={assets}
        loadingAssets={loadingAssets}
        errorLoadingAssets={errorLoadingAssets}
        onRetryLoadAssets={handleRetryLoadAssets}
        loadAssets={loadAssets}
      />

      <ModalQRCode
        isOpen={isQRModalOpen}
        onRequestClose={() => {
          setIsQRModalOpen(false)
          setDeviceForQR(null)
        }}
        device={deviceForQR}
        installation={currentInstallation}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDevice}
        title="¿Eliminar dispositivo?"
        description="Esta acción no se puede deshacer."
      />

      <ModalSuccess isOpen={!!responseMessage} onRequestClose={closeModal} mensaje={responseMessage} />
    </div>
  )
}

export default InstallationDetails
