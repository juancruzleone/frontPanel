import { useRef } from "react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "../../../features/installationsDetails/styles/modalQr.module.css"
import { Printer, ExternalLink } from "lucide-react"
import type { Device, Installation } from "../../installations/hooks/useInstallations"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../../store/authStore"

interface ModalQRCodeProps {
  isOpen: boolean
  onRequestClose: () => void
  device: Device | null
  installation: Installation | null
}

const ModalQRCode = ({ isOpen, onRequestClose, device, installation }: ModalQRCodeProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && device?.codigoQR) {
      generateQRCode()
    }
  }, [isOpen, device])

  const generateQRCode = async () => {
    if (!device?.codigoQR) return

    setLoading(true)
    try {
      const qrDataURL = await QRCode.toDataURL(device.codigoQR, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
      setQrCodeDataURL(qrDataURL)
    } catch (error) {
      console.error("Error generating QR code:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('installationDetails.qrCode')} - ${device?.nombre}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              border-radius: 10px;
              background: white;
            }
            .qr-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .qr-info {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            .qr-code {
              margin: 15px 0;
            }
            .qr-url {
              font-size: 12px;
              color: #888;
              word-break: break-all;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-title">${device?.nombre}</div>
            <div class="qr-info">
              <strong>${t('installationDetails.installation')}:</strong> ${installation?.company}<br>
              <strong>${t('installationDetails.location')}:</strong> ${device?.ubicacion}<br>
              <strong>${t('installationDetails.category')}:</strong> ${device?.categoria}
            </div>
            <div class="qr-code">
              <img src="${qrCodeDataURL}" alt="${t('installationDetails.qrCode')}" />
            </div>
            <div class="qr-url">
              ${t('installationDetails.scanQRDescription')}
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleOpenURL = () => {
    if (!device) return
    
    // Si el usuario está logeado, navegar al formulario interno
    if (token && installation?._id && device._id) {
      console.log('✅ Usuario logeado - Navegando a formulario interno')
      navigate(`/formulario-interno/${installation._id}/${device._id}`)
      onRequestClose() // Cerrar el modal
    } else {
      // Si NO está logeado, abrir el codigoQR (que mostrará el PDF)
      console.log('⚠️ Usuario NO logeado - Abriendo codigoQR')
      if (device.codigoQR) {
        window.open(device.codigoQR, "_blank")
      }
    }
  }

  if (!isOpen || !device) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installationDetails.qrCode')} - {device.nombre}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.deviceInfo}>
            <p>
              <strong>{t('installationDetails.installation')}:</strong> {installation?.company}
            </p>
            <p>
              <strong>{t('installationDetails.location')}:</strong> {device.ubicacion}
            </p>
            <p>
              <strong>{t('installationDetails.category')}:</strong> {device.categoria}
            </p>
          </div>

          <div className={styles.qrContainer} ref={printRef}>
            {loading ? (
              <div className={styles.loading}>{t('installationDetails.generatingQR')}</div>
            ) : qrCodeDataURL ? (
              <>
                <img src={qrCodeDataURL || "/placeholder.svg"} alt={t('installationDetails.qrCode')} className={styles.qrImage} />
                <p className={styles.qrDescription}>{t('installationDetails.scanQRDescription')}</p>
              </>
            ) : (
              <div className={styles.error}>{t('installationDetails.errorGeneratingQR')}</div>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.modalButton} onClick={handleOpenURL} disabled={!device.codigoQR}>
              <ExternalLink size={16} />
              {t('installationDetails.openForm')}
            </button>
            <button className={styles.modalButton + ' ' + styles.secondary} onClick={handlePrint} disabled={!qrCodeDataURL}>
              <Printer size={16} />
              {t('installationDetails.printQR')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalQRCode
