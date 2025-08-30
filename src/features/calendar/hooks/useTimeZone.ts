import { useState, useEffect } from 'react';
import { getUserTimeZone, getTimeZoneInfo } from '../utils/dateUtils';

export interface TimeZoneInfo {
  timeZone: string;
  offset: number;
  offsetString: string;
  isUTC: boolean;
}

export const useTimeZone = () => {
  const [timeZoneInfo, setTimeZoneInfo] = useState<TimeZoneInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const info = getTimeZoneInfo();
      setTimeZoneInfo(info);
    } catch (error) {
      console.error('Error al obtener información de zona horaria:', error);
      // Fallback a UTC
      setTimeZoneInfo({
        timeZone: 'UTC',
        offset: 0,
        offsetString: '+00:00',
        isUTC: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserTimeZoneName = () => {
    if (!timeZoneInfo) return 'UTC';
    
    // Mapear zonas horarias comunes a nombres más legibles
    const timeZoneMap: Record<string, string> = {
      'America/New_York': 'Nueva York (EST/EDT)',
      'America/Chicago': 'Chicago (CST/CDT)',
      'America/Denver': 'Denver (MST/MDT)',
      'America/Los_Angeles': 'Los Ángeles (PST/PDT)',
      'Europe/London': 'Londres (GMT/BST)',
      'Europe/Paris': 'París (CET/CEST)',
      'Europe/Madrid': 'Madrid (CET/CEST)',
      'Europe/Berlin': 'Berlín (CET/CEST)',
      'Asia/Tokyo': 'Tokio (JST)',
      'Asia/Shanghai': 'Shanghai (CST)',
      'Australia/Sydney': 'Sídney (AEST/AEDT)',
      'UTC': 'UTC (Tiempo Universal)'
    };

    return timeZoneMap[timeZoneInfo.timeZone] || timeZoneInfo.timeZone;
  };

  const isDST = () => {
    if (!timeZoneInfo) return false;
    
    const now = new Date();
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    
    const janOffset = jan.getTimezoneOffset();
    const julOffset = jul.getTimezoneOffset();
    
    return Math.min(janOffset, julOffset) === now.getTimezoneOffset();
  };

  return {
    timeZoneInfo,
    loading,
    getUserTimeZoneName,
    isDST,
    timeZone: timeZoneInfo?.timeZone || 'UTC',
    offset: timeZoneInfo?.offset || 0,
    offsetString: timeZoneInfo?.offsetString || '+00:00'
  };
}; 