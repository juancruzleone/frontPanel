import React from 'react'
import { LayoutGrid, Table, Kanban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ViewToggle.module.css'

export type ViewMode = 'cards' | 'table' | 'kanban'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  label?: string
  allowedViews?: readonly ViewMode[]
}

const DEFAULT_ALLOWED_VIEWS: readonly ViewMode[] = ['cards', 'table']

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange, label, allowedViews = DEFAULT_ALLOWED_VIEWS }) => {
  const { t } = useTranslation()
  const views = allowedViews.length > 0 ? allowedViews : DEFAULT_ALLOWED_VIEWS
  const sliderIndex = Math.max(views.indexOf(view), 0)
  
  const getSliderTransform = () => {
    return `translateX(${sliderIndex * 100}%)`
  }

  const viewOptions = [
    {
      value: 'cards' as const,
      icon: <LayoutGrid size={18} />,
      label: t('viewToggle.cards'),
      ariaLabel: t('viewToggle.cardsView'),
    },
    {
      value: 'table' as const,
      icon: <Table size={18} />,
      label: t('viewToggle.table'),
      ariaLabel: t('viewToggle.tableView'),
    },
    {
      value: 'kanban' as const,
      icon: <Kanban size={18} />,
      label: t('viewToggle.kanban') || 'Kanban',
      ariaLabel: t('viewToggle.kanbanView') || 'Vista Kanban',
    },
  ].filter((option) => views.includes(option.value))
  
  return (
    <div className={styles.viewToggleContainer}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={`${styles.toggleSwitch} ${views.length === 3 ? styles.threeOptions : styles.twoOptions}`} role="group" aria-label={t('viewToggle.contentView')}>
        {viewOptions.map((option) => (
          <button
            key={option.value}
            className={`${styles.toggleButton} ${view === option.value ? styles.active : ''}`}
            onClick={() => onViewChange(option.value)}
            aria-label={option.ariaLabel}
            aria-pressed={view === option.value}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
        <div 
          className={styles.slider} 
          style={{ transform: getSliderTransform() }}
        />
      </div>
    </div>
  )
}

export { ViewToggle }
export default ViewToggle
