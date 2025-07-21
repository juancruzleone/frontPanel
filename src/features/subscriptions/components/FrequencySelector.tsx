import React from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Calendar } from 'lucide-react'
import { useTheme } from '../../../shared/hooks/useTheme'
import styles from '../styles/subscriptions.module.css'
import type { FrequencyOption } from '../hooks/useSubscriptions'

interface FrequencySelectorProps {
  value: string
  onChange: (frequency: string) => void
  options: FrequencyOption[]
  disabled?: boolean
  placeholder?: string
  showIcon?: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  showIcon = true,
  size = 'medium',
  className = '',
  onBlur,
}) => {
  const { t } = useTranslation()
  const { dark } = useTheme()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  // Usar un span contenedor con position: relative para alinear la flecha correctamente
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        aria-label={placeholder || t('subscriptions.selectFrequency')}
        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%' }}
        onBlur={onBlur}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown 
        size={20} 
        className={styles.selectIcon + ' ' + (dark ? styles.dark : styles.light)}
      />
    </span>
  )
}

export default FrequencySelector 