import { useTranslation } from "react-i18next"
import { Edit, Trash } from "lucide-react"
import type { Norma, Regla } from "../services/complianceTypes"
import styles from "../styles/compliance.module.css"

interface ReglasListProps {
  reglas: Regla[]
  normas: Norma[]
  isAdmin: boolean
  onEdit: (regla: Regla) => void
  onDelete: (regla: Regla) => void
}

const normaCodigo = (normas: Norma[], normaId: string): string =>
  normas.find((norma) => norma._id === normaId)?.codigo ?? normaId

/**
 * Listado de reglas. Renderiza controles de edición/eliminación SOLO cuando
 * la sesión es admin (los técnicos no ven ningún control de authoring).
 */
export const ReglasList: React.FC<ReglasListProps> = ({
  reglas,
  normas,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation()

  if (reglas.length === 0) {
    return <p className={styles.emptyText}>{t("compliance.reglas.empty")}</p>
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>{t("compliance.reglas.nombre")}</th>
            <th>{t("compliance.reglas.norma")}</th>
            <th>{t("compliance.reglas.operador")}</th>
            <th>{t("compliance.reglas.objetivoTipo")}</th>
            <th>{t("compliance.reglas.habilitada")}</th>
            {isAdmin && <th aria-label={t("common.actions")} />}
          </tr>
        </thead>
        <tbody>
          {reglas.map((regla) => (
            <tr key={regla._id}>
              <td>{regla.nombre}</td>
              <td>{normaCodigo(normas, regla.normaId)}</td>
              <td>{t(`compliance.operador.${regla.operador}`)}</td>
              <td>{t(`compliance.reglas.objetivoTipoOptions.${regla.objetivoTipo}`)}</td>
              <td>
                <span
                  className={`${styles.badge} ${regla.habilitada ? styles.badgeActive : styles.badgeInactive}`}
                >
                  {regla.habilitada ? t("common.active") : t("common.inactive")}
                </span>
              </td>
              {isAdmin && (
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEdit(regla)}
                      aria-label={t("common.edit")}
                      title={t("common.edit")}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onDelete(regla)}
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