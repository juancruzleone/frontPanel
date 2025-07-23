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
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void
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
  onFocus,
}) => {
  const { t } = useTranslation()
  const { dark } = useTheme()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    // Solo ejecutar onBlur si se proporciona y si no estamos yendo a un date picker
    if (onBlur) {
      const relatedTarget = e.relatedTarget as HTMLElement
      // Verificar si el nuevo foco NO es un date picker
      if (!relatedTarget || (!relatedTarget.hasAttribute('data-date-input') && 
          !relatedTarget.closest('[data-date-input]'))) {
        onBlur(e)
      }
    }
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
        onBlur={handleBlur}
        onFocus={onFocus}
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