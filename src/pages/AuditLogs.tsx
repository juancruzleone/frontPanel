import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldAlert, History, Info } from "lucide-react"
import { auditService } from "../features/audit/services/auditService"
import { useAuditStore } from "../store/auditStore"
import { useAuthStore } from "../store/authStore"
import { AuditLog } from "../features/audit/types/audit.types"
import styles from "../features/audit/styles/auditLogs.module.css"

const AuditLogs: React.FC = () => {
  const { t } = useTranslation()
  const { logs, setLogs, ownerId } = useAuditStore()
  const { userId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backendMissing, setBackendMissing] = useState(false)

  const validLogs = userId && ownerId === userId ? logs : []

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        if (!navigator.onLine && validLogs.length > 0) {
          setLoading(false)
          return
        }
        const data = await auditService.getLogs()
        setLogs(data.logs)
        setError(null)
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'BACKEND_NOT_IMPLEMENTED') {
          setBackendMissing(true)
        } else if (validLogs.length > 0) {
          // Keep cached logs if offline/error
        } else {
          setError(err instanceof Error ? err.message : t('audit.errorUnknown'))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [validLogs.length, setLogs, userId, ownerId])

  const displayLogs = validLogs

  return (
    <div className={styles.container}>
      <div className={styles.topSection}>
        <div className={styles.headerWithToggle}>
          <h1 className={styles.title}>{t('audit.title')}</h1>
        </div>
      </div>

      {loading ? (
        <div className={styles.statusContainer}>
          <div className={styles.spinner}></div>
          <p>{t('audit.loading')}</p>
        </div>
      ) : backendMissing ? (
        <div className={styles.infoBox}>
          <ShieldAlert className={styles.infoIcon} size={48} />
          <h2 className={styles.infoTitle}>{t('audit.backendRequiredTitle')}</h2>
          <p className={styles.infoText}>
            {t('audit.backendRequired')}
          </p>
          <div className={styles.detailsBox}>
            <Info size={16} />
            <span>{t('audit.endpointExpected')} <code>/api/audit-logs</code></span>
          </div>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <ShieldAlert size={24} />
          <p>{error}</p>
        </div>
      ) : displayLogs.length === 0 ? (
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
              {displayLogs.map((log) => (
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
