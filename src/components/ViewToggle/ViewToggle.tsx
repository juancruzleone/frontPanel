import React from 'react'
import { LayoutGrid, Table, Kanban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ViewToggle.module.css'

interface ViewToggleProps {
  view: 'cards' | 'table' | 'kanban'
  onViewChange: (view: 'cards' | 'table' | 'kanban') => void
  label?: string
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange, label }) => {
  const { t } = useTranslation()
  
  const getSliderTransform = () => {
    switch(view) {
      case 'table': return 'translateX(100%)';
      case 'kanban': return 'translateX(200%)';
      default: return 'translateX(0)';
    }
  }
  
  return (
    <div className={styles.viewToggleContainer}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.toggleSwitch} role="group" aria-label={t('viewToggle.contentView')}>
        <button
          className={`${styles.toggleButton} ${view === 'cards' ? styles.active : ''}`}
          onClick={() => onViewChange('cards')}
          aria-label={t('viewToggle.cardsView')}
          aria-pressed={view === 'cards'}
        >
          <LayoutGrid size={18} />
          <span>{t('viewToggle.cards')}</span>
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'table' ? styles.active : ''}`}
          onClick={() => onViewChange('table')}
          aria-label={t('viewToggle.tableView')}
          aria-pressed={view === 'table'}
        >
          <Table size={18} />
          <span>{t('viewToggle.table')}</span>
        </button>
        <button
          className={`${styles.toggleButton} ${view === 'kanban' ? styles.active : ''}`}
          onClick={() => onViewChange('kanban')}
          aria-label={t('viewToggle.kanbanView') || 'Vista Kanban'}
          aria-pressed={view === 'kanban'}
        >
          <Kanban size={18} />
          <span>{t('viewToggle.kanban') || 'Kanban'}</span>
        </button>
        <div 
          className={styles.slider} 
          style={{ 
            transform: getSliderTransform(),
            width: '33.333%' 
          }}
        />
      </div>
    </div>
  )
}

export default ViewToggle
