import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTimeZone } from '../hooks/useTimeZone';
import styles from '../styles/calendar.module.css';

interface TimeZoneInfoProps {
  showDetails?: boolean;
  className?: string;
}

const TimeZoneInfo: React.FC<TimeZoneInfoProps> = ({ showDetails = false, className = '' }) => {
  const { t } = useTranslation();
  const { loading } = useTimeZone();

  if (loading) {
    return (
      <div className={`${styles.timeZoneInfo} ${className}`}>
        <span>🌍 {t('common.loading') || 'Cargando...'}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.timeZoneInfo} ${className}`}>
      <span>{t('calendar.timezoneLabel')}</span>

      {showDetails && (
        <div style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          Las fechas se muestran en tu zona horaria local
        </div>
      )}
    </div>
  );
};

export default TimeZoneInfo; 