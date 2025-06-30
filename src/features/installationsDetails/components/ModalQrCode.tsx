import { useRef } from "react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import styles from "../../../features/installationsDetails/styles/modalQr.module.css"
import { Printer, ExternalLink } from "lucide-react"
import type { Device, Installation } from "../../installations/hooks/useInstallations"

interface ModalQRCodeProps {
  isOpen: boolean
  onRequestClose: () => void
  device: Device | null
  installation: Installation | null
}

const ModalQRCode = ({ isOpen, onRequestClose, device, installation }: ModalQRCodeProps) => {
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
          <title>Código QR - ${device?.nombre}</title>
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
              <strong>Instalación:</strong> ${installation?.company}<br>
              <strong>Ubicación:</strong> ${device?.ubicacion}<br>
              <strong>Categoría:</strong> ${device?.categoria}
            </div>
            <div class="qr-code">
              <img src="${qrCodeDataURL}" alt="Código QR" />
            </div>
            <div class="qr-url">
              Escanea este código para acceder al formulario de mantenimiento
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
    if (device?.codigoQR) {
      window.open(device.codigoQR, "_blank")
    }
  }

  if (!isOpen || !device) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Código QR - {device.nombre}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.deviceInfo}>
            <p>
              <strong>Instalación:</strong> {installation?.company}
            </p>
            <p>
              <strong>Ubicación:</strong> {device.ubicacion}
            </p>
            <p>
              <strong>Categoría:</strong> {device.categoria}
            </p>
          </div>

          <div className={styles.qrContainer} ref={printRef}>
            {loading ? (
              <div className={styles.loading}>Generando código QR...</div>
            ) : qrCodeDataURL ? (
              <>
                <img src={qrCodeDataURL || "/placeholder.svg"} alt="Código QR" className={styles.qrImage} />
                <p className={styles.qrDescription}>Escanea este código para acceder al formulario de mantenimiento</p>
              </>
            ) : (
              <div className={styles.error}>Error al generar el código QR</div>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.openButton} onClick={handleOpenURL} disabled={!device.codigoQR}>
              <ExternalLink size={16} />
              Abrir formulario
            </button>
            <button className={styles.printButton} onClick={handlePrint} disabled={!qrCodeDataURL}>
              <Printer size={16} />
              Imprimir QR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalQRCode
