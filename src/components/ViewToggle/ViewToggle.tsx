import React from 'react'
import { LayoutGrid, Table } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ViewToggle.module.css'

interface ViewToggleProps {
  view: 'cards' | 'table'
  onViewChange: (view: 'cards' | 'table') => void
  label?: string
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange, label }) => {
  const { t } = useTranslation()
  
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
        <div 
          className={styles.slider} 
          style={{ transform: view === 'table' ? 'translateX(100%)' : 'translateX(0)' }}
        />
      </div>
    </div>
  )
}

export default ViewToggle
