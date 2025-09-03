import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react'
import styles from './notFound.module.css'
import { useTranslation } from 'react-i18next'

const NotFound: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleGoHome = () => {
    navigate('/inicio')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className={styles.containerNotFound}>
      <div className={styles.content}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <AlertTriangle size={80} />
          </div>
          
          <h1 className={styles.errorTitle}>404</h1>
          <h2 className={styles.errorSubtitle}>{t('notFound.title')}</h2>
          <p className={styles.errorDescription}>
            {t('notFound.description')}
          </p>
          
          <div className={styles.errorActions}>
            <button 
              className={styles.primaryButton}
              onClick={handleGoHome}
            >
              <Home size={20} />
              {t('notFound.goHome')}
            </button>
            
            <button 
              className={styles.secondaryButton}
              onClick={handleGoBack}
            >
              <ArrowLeft size={20} />
              {t('notFound.goBack')}
            </button>
          </div>
        </div>

        <div className={styles.suggestionsCard}>
          <h3 className={styles.suggestionsTitle}>{t('notFound.suggestionsTitle')}</h3>
          <div className={styles.suggestionsList}>
            <div className={styles.suggestionItem}>
              <span className={styles.suggestionNumber}>1</span>
              <span>{t('notFound.suggestion1')}</span>
            </div>
            <div className={styles.suggestionItem}>
              <span className={styles.suggestionNumber}>2</span>
              <span>{t('notFound.suggestion2')}</span>
            </div>
            <div className={styles.suggestionItem}>
              <span className={styles.suggestionNumber}>3</span>
              <span>{t('notFound.suggestion3')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound 