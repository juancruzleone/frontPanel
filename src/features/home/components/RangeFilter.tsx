import { useRef, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import type { RangeOption } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface RangeFilterProps {
  current: RangeOption
  onChange: (range: RangeOption) => void
}

const OPTIONS: RangeOption[] = ["7d", "30d", "90d", "12m"]

export const RangeFilter = ({ current, onChange }: RangeFilterProps) => {
  const { t } = useTranslation()
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1
    const nextIndex = (index + direction + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[nextIndex])
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      className={styles.rangeField}
      role="radiogroup"
      aria-label={t("home.dashboard.rangeLabel")}
      aria-describedby="dashboard-range-help"
    >
      <span className={styles.rangeLabel}>{t("home.dashboard.period")}</span>
      <div className={styles.rangeFilter}>
        {OPTIONS.map((option, index) => (
          <button
            key={option}
            ref={(element) => { buttonRefs.current[index] = element }}
            type="button"
            role="radio"
            aria-checked={current === option}
            tabIndex={current === option ? 0 : -1}
            className={`${styles.rangeButton} ${current === option ? styles.rangeButtonActive : ""}`}
            onClick={() => onChange(option)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {t(`home.range.${option}`, { defaultValue: option })}
          </button>
        ))}
      </div>
      <span id="dashboard-range-help" className={styles.rangeHelp}>
        {t("home.dashboard.rangeHelp")}
      </span>
    </div>
  )
}
