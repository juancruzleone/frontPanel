import React from 'react';
import { useTimeZone } from '../hooks/useTimeZone';
import styles from '../styles/calendar.module.css';

interface TimeZoneInfoProps {
  showDetails?: boolean;
  className?: string;
}

const TimeZoneInfo: React.FC<TimeZoneInfoProps> = ({ showDetails = false, className = '' }) => {
  const { timeZoneInfo, getUserTimeZoneName, isDST, loading } = useTimeZone();

  if (loading) {
    return (
      <div className={`${styles.timeZoneInfo} ${className}`}>
        <span>🌍 Cargando zona horaria...</span>
      </div>
    );
  }

  if (!timeZoneInfo) {
    return null;
  }

  return (
    <div className={`${styles.timeZoneInfo} ${className}`}>
      <span>🌍 {getUserTimeZoneName()}</span>
      <span className={styles.timeZoneOffset}>
        ({timeZoneInfo.offsetString})
      </span>
      {isDST() && (
        <span className={styles.dstIndicator}>
          • Horario de verano
        </span>
      )}
      
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