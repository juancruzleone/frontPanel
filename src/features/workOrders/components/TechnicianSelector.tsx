import React, { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Search, X, User } from "lucide-react"
import styles from "./TechnicianSelector.module.css"

export interface TechnicianOption {
  _id: string
  userName: string
  fullName?: string
  role?: string
  email?: string
}

interface TechnicianSelectorProps {
  technicians: TechnicianOption[]
  selectedTechnicianIds: string[]
  onChange: (selectedIds: string[]) => void
  disabled?: boolean
  error?: boolean
  onBlur?: () => void
  label?: string
}

const getInitials = (name: string): string => {
  if (!name) return "TE"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const TechnicianSelector: React.FC<TechnicianSelectorProps> = ({
  technicians,
  selectedTechnicianIds,
  onChange,
  disabled = false,
  error = false,
  onBlur,
}) => {
  const { t } = useTranslation()
  const tr = (key: string, fallback: string): string => {
    const res = (t as any)(key, fallback)
    if (typeof res === "string") return res
    if (res && typeof res === "object" && "defaultValue" in res) return String(res.defaultValue)
    return fallback
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [onlySelected, setOnlySelected] = useState(false)

  // Filter technicians by search and optionally by selected status
  const filteredTechnicians = useMemo(() => {
    let result = technicians

    if (onlySelected) {
      result = result.filter((tech) => selectedTechnicianIds.includes(tech._id))
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(
        (tech) =>
          (tech.userName && tech.userName.toLowerCase().includes(q)) ||
          (tech.fullName && tech.fullName.toLowerCase().includes(q)) ||
          (tech.email && tech.email.toLowerCase().includes(q)),
      )
    }

    return result
  }, [technicians, selectedTechnicianIds, onlySelected, searchTerm])

  const handleToggle = (id: string) => {
    if (disabled) return
    if (selectedTechnicianIds.includes(id)) {
      onChange(selectedTechnicianIds.filter((item) => item !== id))
    } else {
      onChange([...selectedTechnicianIds, id])
    }
  }

  const handleClearAll = () => {
    if (disabled) return
    onChange([])
  }

  const selectedTechs = useMemo(
    () => technicians.filter((tech) => selectedTechnicianIds.includes(tech._id)),
    [technicians, selectedTechnicianIds],
  )

  return (
    <div className={styles.container} onBlur={onBlur}>
      {/* Search Bar */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} aria-hidden />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={tr("workOrders.searchTechnician", "Buscar técnico por nombre o usuario...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          aria-label={tr("workOrders.searchTechnician", "Buscar técnico")}
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearSearchBtn}
            onClick={() => setSearchTerm("")}
            aria-label="Limpiar búsqueda"
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>

      {/* Selected Chips */}
      {selectedTechs.length > 0 && (
        <div className={styles.chipsContainer}>
          {selectedTechs.map((tech) => (
            <span key={tech._id} className={styles.chip}>
              <span>{tech.fullName || tech.userName}</span>
              {!disabled && (
                <button
                  type="button"
                  className={styles.chipRemoveBtn}
                  onClick={() => handleToggle(tech._id)}
                  aria-label={`Quitar ${tech.userName}`}
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Toolbar / Counter */}
      <div className={styles.toolbar}>
        <span
          className={`${styles.selectedCount} ${
            selectedTechnicianIds.length > 0 ? styles.selectedCountActive : ""
          }`}
        >
          {selectedTechnicianIds.length === 0
            ? tr("workOrders.noTechniciansSelected", "Ningún técnico seleccionado")
            : `${selectedTechnicianIds.length} ${
                selectedTechnicianIds.length === 1
                  ? tr("workOrders.technicianSelected", "técnico seleccionado")
                  : tr("workOrders.techniciansSelected", "técnicos seleccionados")
              }`}
        </span>

        <div className={styles.toolbarActions}>
          {selectedTechnicianIds.length > 0 && !disabled && (
            <button type="button" className={styles.toolbarBtn} onClick={handleClearAll}>
              {tr("common.clear", "Limpiar")}
            </button>
          )}

          {selectedTechnicianIds.length > 0 && (
            <button
              type="button"
              className={`${styles.filterToggleBtn} ${onlySelected ? styles.filterToggleBtnActive : ""}`}
              onClick={() => setOnlySelected((prev) => !prev)}
            >
              {onlySelected
                ? tr("workOrders.showAll", "Ver todos")
                : tr("workOrders.onlySelected", "Solo seleccionados")}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Technicians List */}
      <div
        className={`${styles.list} ${error ? styles.hasError : ""}`}
        role="group"
        aria-label={tr("workOrders.techniciansList", "Listado de técnicos")}
      >
        {technicians.length === 0 ? (
          <div className={styles.emptyState}>
            <User size={24} aria-hidden />
            <p>{tr("workOrders.noTechniciansAvailable", "No hay técnicos disponibles")}</p>
          </div>
        ) : filteredTechnicians.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {tr("workOrders.noTechniciansFound", "No se encontraron técnicos para la búsqueda.")}
            </p>
            {searchTerm && (
              <button
                type="button"
                className={styles.emptyStateBtn}
                onClick={() => setSearchTerm("")}
              >
                {tr("common.clearSearch", "Limpiar búsqueda")}
              </button>
            )}
          </div>
        ) : (
          filteredTechnicians.map((tech) => {
            const isSelected = selectedTechnicianIds.includes(tech._id)
            const displayName = tech.fullName || tech.userName

            return (
              <div
                key={tech._id}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ""}`}
                onClick={() => handleToggle(tech._id)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleToggle(tech._id)
                  }
                }}
              >
                <div className={styles.itemLeft}>
                  <div className={styles.avatar}>{getInitials(displayName)}</div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{displayName}</span>
                    <span className={styles.itemRole}>
                      {tech.role ? tr(`roles.${tech.role.toLowerCase()}`, tech.role) : tr("roles.technician", "Técnico")}
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={() => {}} // Controlled via parent item click
                  disabled={disabled}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
