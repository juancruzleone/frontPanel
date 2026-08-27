import { useTranslation } from "react-i18next"
import { Edit, Trash } from "lucide-react"
import type { Norma } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

interface NormasListProps {
  normas: Norma[]
  isAdmin: boolean
  onEdit: (norma: Norma) => void
  onDelete: (norma: Norma) => void
}

/**
 * Listado de normas. Renderiza controles de edición/eliminación SOLO cuando
 * la sesión es admin (los técnicos no ven ningún control de authoring).
 */
export const NormasList: React.FC<NormasListProps> = ({
  normas,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation()

  if (normas.length === 0) {
    return <p className={styles.emptyText}>{t("compliance.normas.empty")}</p>
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{t("compliance.normas.codigo")}</th>
            <th>{t("compliance.normas.familiaNorma")}</th>
            <th>{t("compliance.normas.descripcion")}</th>
            <th>{t("compliance.normas.activa")}</th>
            {isAdmin && <th aria-label={t("common.actions")} />}
          </tr>
        </thead>
        <tbody>
          {normas.map((norma) => (
            <tr key={norma._id}>
              <td>{norma.codigo}</td>
              <td>{norma.familiaNorma}</td>
              <td>{norma.descripcion || "—"}</td>
              <td>
                <span
                  className={`${styles.badge} ${norma.activa ? styles.badgeActive : styles.badgeInactive}`}
                >
                  {norma.activa ? t("common.active") : t("common.inactive")}
                </span>
              </td>
              {isAdmin && (
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEdit(norma)}
                      aria-label={t("common.edit")}
                      title={t("common.edit")}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onDelete(norma)}
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}