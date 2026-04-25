import React from "react"
import styles from "../styles/home.module.css"
import { RangeOption } from "../types/homeTypes"
import { useTranslation } from "react-i18next"

interface RangeFilterProps {
  current: RangeOption
  onChange: (range: RangeOption) => void
}

const RangeFilter: React.FC<RangeFilterProps> = ({ current, onChange }) => {
  const { t } = useTranslation()
  const options: RangeOption[] = ["7d", "30d", "90d", "12m"]

  return (
    <div className={styles.rangeFilter}>
      {options.map((opt) => (
        <button
          key={opt}
          className={`${styles.rangeButton} ${current === opt ? styles.rangeButtonActive : ''}`}
          onClick={() => onChange(opt)}
        >
          {t(`home.range.${opt}`, { defaultValue: opt })}
        </button>
      ))}
    </div>
  )
}

export default RangeFilter
