import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldAlert, History, Info } from "lucide-react"
import { auditService } from "../features/audit/services/auditService"
import { AuditLog } from "../features/audit/types/audit.types"
import styles from "../features/audit/styles/auditLogs.module.css"

const AuditLogs: React.FC = () => {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendMissing, setBackendMissing] = useState(false)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const data = await auditService.getLogs()
        setLogs(data.logs)
        setError(null)
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'BACKEND_NOT_IMPLEMENTED') {
          setBackendMissing(true)
        } else {
          setError(err instanceof Error ? err.message : "Error desconocido")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <History className={styles.titleIcon} size={28} />
          <div>
            <h1 className={styles.title}>{t('audit.title')}</h1>
            <p className={styles.subtitle}>{t('audit.subtitle')}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className={styles.statusContainer}>
          <div className={styles.spinner}></div>
          <p>{t('audit.loading')}</p>
        </div>
      ) : backendMissing ? (
        <div className={styles.infoBox}>
          <ShieldAlert className={styles.infoIcon} size={48} />
          <h2 className={styles.infoTitle}>Soporte de Backend Requerido</h2>
          <p className={styles.infoText}>
            {t('audit.backendRequired')}
          </p>
          <div className={styles.detailsBox}>
            <Info size={16} />
            <span>Se espera un endpoint en <code>/api/audit-logs</code></span>
          </div>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <ShieldAlert size={24} />
          <p>{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyBox}>
          <p>{t('audit.noLogs')}</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('audit.table.date')}</th>
                <th>{t('audit.table.user')}</th>
                <th>{t('audit.table.action')}</th>
                <th>{t('audit.table.target')}</th>
                <th>{t('audit.table.details')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.userName}</td>
                  <td>{log.action}</td>
                  <td>{log.targetType}</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AuditLogs
