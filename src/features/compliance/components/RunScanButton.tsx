import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlayCircle } from "lucide-react"
import { useComplianceData } from "../hooks/useComplianceData"
import { useScanPolling } from "../hooks/useScanPolling"
import styles from "../styles/compliance.module.css"

interface RunScanButtonProps {
  /** Se invoca al llegar el escaneo a un estado terminal (refresco sin recarga). */
  onScanCompleted?: () => void
}

/**
 * Dispara el escaneo y muestra el progreso vía polling (3s) hasta el estado
 * terminal. Al completar refresca los estados vía onScanCompleted.
 */
export const RunScanButton: React.FC<RunScanButtonProps> = ({ onScanCompleted }) => {
  const { t } = useTranslation()
  const { runScan } = useComplianceData()
  const [escaneoId, setEscaneoId] = useState<string | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  const handleRunScan = async () => {
    setTriggerError(null)
    try {
      const escaneo = await runScan()
      setEscaneoId(escaneo._id)
    } catch (err: unknown) {
      setTriggerError(
        err instanceof Error ? err.message : t("compliance.scan.alreadyRunning"),
      )
    }
  }

  const handleComplete = useCallback(() => {
    onScanCompleted?.()
  }, [onScanCompleted])

  const { escaneo, isPolling, error } = useScanPolling(escaneoId, {
    onComplete: handleComplete,
  })

  const escaneoActivo =
    escaneo !== null && (escaneo.estado === "pendiente" || escaneo.estado === "corriendo")
  const escaneoCompletado = escaneo !== null && escaneo.estado === "completado"
  const escaneoError = escaneo !== null && escaneo.estado === "error"

  const porcentaje =
    escaneo && escaneo.objetivosTotales > 0
      ? Math.round((escaneo.procesados / escaneo.objetivosTotales) * 100)
      : 0

  return (
    <section className={styles.scanSection}>
      <button
        type="button"
        className={styles.scanButton}
        onClick={handleRunScan}
        disabled={isPolling}
      >
        <PlayCircle size={18} />
        {t("compliance.scan.runButton")}
      </button>

      {triggerError && (
        <p role="alert" className={styles.errorText}>
          {triggerError}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}

      {escaneoActivo && (
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            <span>
              {t(
                escaneo.estado === "corriendo"
                  ? "compliance.scan.running"
                  : "compliance.scan.pending",
              )}
            </span>
            <span>
              {t("compliance.scan.progress", {
                procesados: escaneo.procesados,
                total: escaneo.objetivosTotales,
              })}
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      {escaneoCompletado && (
        <div className={styles.scanResult}>
          <p className={styles.successText}>{t("compliance.scan.completed")}</p>
          <div className={styles.counterRow}>
            <span>
              {t("compliance.scan.counter.cumplidos")}: <strong>{escaneo.cumplidos}</strong>
            </span>
            <span>
              {t("compliance.scan.counter.incumplidos")}:{" "}
              <strong>{escaneo.incumplidos}</strong>
            </span>
            <span>
              {t("compliance.scan.counter.sinEvidencia")}:{" "}
              <strong>{escaneo.sinEvidencia}</strong>
            </span>
            <span>
              {t("compliance.scan.counter.errores")}: <strong>{escaneo.errores}</strong>
            </span>
          </div>
        </div>
      )}

      {escaneoError && (
        <div className={styles.scanResult}>
          <p role="alert" className={styles.errorText}>
            {t("compliance.scan.errorState")}
          </p>
          {escaneo.errorDetalle && (
            <p className={styles.errorDetail}>{escaneo.errorDetalle}</p>
          )}
        </div>
      )}
    </section>
  )
}