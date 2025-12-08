import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { FileText, Calendar, Building2, MapPin, Wrench, History, ExternalLink } from "lucide-react"
import { getPublicDeviceForm, getPublicMaintenanceHistory, type MaintenanceRecord } from "../features/deviceForms/services/maintenanceHistoryService"
import styles from "../features/deviceForms/styles/publicDeviceView.module.css"

interface DeviceInfo {
  _id: string
  assetId: string
  nombre: string
  marca: string
  modelo: string
  numeroSerie: string
  ubicacion: string
  categoria: string
}

interface InstallationInfo {
  _id: string
  company: string
  address: string
  floorSector: string
  city: string
  province: string
  installationType: string
  fullAddress: string
}

const PublicDeviceViewPage: React.FC = () => {
  const { installationId, deviceId } = useParams()
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [installationInfo, setInstallationInfo] = useState<InstallationInfo | null>(null)
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!installationId || !deviceId) {
        setError("Parámetros inválidos")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Obtener información del dispositivo
        const deviceFormResponse = await getPublicDeviceForm(installationId, deviceId)
        setDeviceInfo(deviceFormResponse.deviceInfo)
        setInstallationInfo(deviceFormResponse.installationInfo)

        // Obtener historial de mantenimientos
        const history = await getPublicMaintenanceHistory(installationId, deviceId)
        setMaintenanceHistory(history)
        
        setLoading(false)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("No se pudo cargar la información del dispositivo")
        setLoading(false)
      }
    }

    fetchData()
  }, [installationId, deviceId])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenPDF = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Cargando información del dispositivo...</p>
        </div>
      </div>
    )
  }

  if (error || !deviceInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <Wrench size={48} />
          <h2>Error</h2>
          <p>{error || "No se encontró el dispositivo"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Wrench size={32} />
        </div>
        <h1>Información del Dispositivo</h1>
        <p>Vista pública de mantenimientos</p>
      </div>

      {/* Información de la instalación */}
      {installationInfo && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Building2 size={20} />
            <h2>Instalación</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <strong>Empresa:</strong>
              <span>{installationInfo.company}</span>
            </div>
            <div className={styles.infoRow}>
              <MapPin size={18} />
              <span>{installationInfo.fullAddress}</span>
            </div>
            <div className={styles.infoRow}>
              <strong>Tipo:</strong>
              <span>{installationInfo.installationType}</span>
            </div>
          </div>
        </div>
      )}

      {/* Información del dispositivo */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Wrench size={20} />
          <h2>Detalles del Dispositivo</h2>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.infoRow}>
            <strong>Nombre:</strong>
            <span>{deviceInfo.nombre}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>Ubicación:</strong>
            <span>{deviceInfo.ubicacion}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>Categoría:</strong>
            <span>{deviceInfo.categoria}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>Marca:</strong>
            <span>{deviceInfo.marca}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>Modelo:</strong>
            <span>{deviceInfo.modelo}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>N° Serie:</strong>
            <span>{deviceInfo.numeroSerie}</span>
          </div>
        </div>
      </div>

      {/* Último mantenimiento destacado */}
      {maintenanceHistory.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FileText size={20} />
            <h2>Último Mantenimiento Realizado</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.lastMaintenance}>
              <div className={styles.lastMaintenanceDate}>
                <Calendar size={20} />
                <span>{maintenanceHistory[0].formattedDate || formatDate(maintenanceHistory[0].date)}</span>
              </div>
              {maintenanceHistory[0].responses?.observaciones && (
                <div className={styles.lastMaintenanceObs}>
                  <strong>Observaciones:</strong>
                  <p>{maintenanceHistory[0].responses.observaciones}</p>
                </div>
              )}
              <button
                className={styles.lastMaintenancePdfButton}
                onClick={() => handleOpenPDF(maintenanceHistory[0].pdfUrl)}
              >
                <FileText size={24} />
                <span>Ver Reporte de Mantenimiento</span>
                <ExternalLink size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial completo de mantenimientos */}
      {maintenanceHistory.length > 1 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <History size={20} />
            <h2>Historial Completo</h2>
            <span className={styles.badge}>{maintenanceHistory.length}</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.maintenanceList}>
              {maintenanceHistory.map((maintenance, index) => (
                <div key={maintenance._id} className={styles.maintenanceCard}>
                  <div className={styles.maintenanceHeader}>
                    <div className={styles.maintenanceNumber}>
                      <FileText size={18} />
                      <span>Mantenimiento #{maintenanceHistory.length - index}</span>
                    </div>
                    <div className={styles.maintenanceDate}>
                      <Calendar size={16} />
                      <span>{maintenance.formattedDate || formatDate(maintenance.date)}</span>
                    </div>
                  </div>
                  
                  {maintenance.responses?.observaciones && (
                    <div className={styles.maintenanceBody}>
                      <strong>Observaciones:</strong>
                      <p>{maintenance.responses.observaciones}</p>
                    </div>
                  )}
                  
                  <button
                    className={styles.pdfButton}
                    onClick={() => handleOpenPDF(maintenance.pdfUrl)}
                  >
                    <FileText size={18} />
                    Ver Reporte PDF
                    <ExternalLink size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>Sistema de Gestión de Mantenimiento (GMAO)</p>
      </div>
    </div>
  )
}

export default PublicDeviceViewPage
