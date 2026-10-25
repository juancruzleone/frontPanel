import { useTranslation } from 'react-i18next'
import type { PaginationMetadata } from '../../types/pagination'
import styles from './Pagination.module.css'

interface PaginationProps {
  pagination: PaginationMetadata
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

export function Pagination({ pagination, onPageChange, disabled = false, className = '' }: PaginationProps) {
  const { t } = useTranslation()
  if (!pagination) return null
  const { page = 1, totalPages = 1 } = pagination
  return (
    <nav className={`${styles.pagination} ${className}`} aria-label={t('common.page')}>
      <button type="button" disabled={disabled || page <= 1 || totalPages === 0} onClick={() => onPageChange(page - 1)}>
        {t('common.previous')}
      </button>
      <span aria-live="polite">{t('common.page')} {totalPages === 0 ? 0 : page} {t('common.of')} {totalPages}</span>
      <button type="button" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
        {t('common.next')}
      </button>
    </nav>
  )
}
