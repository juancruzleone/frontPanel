/**
 * Utilidades para manejo de fechas en el calendario
 * Resuelve problemas de zona horaria y UTC
 */

/**
 * Obtiene la zona horaria del usuario
 * @returns string con la zona horaria (ej: "America/New_York", "Europe/Madrid")
 */
export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback a zona horaria por defecto
    return 'UTC';
  }
};

/**
 * Obtiene el offset de la zona horaria del usuario en minutos
 * @returns number con el offset en minutos
 */
export const getUserTimeZoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * Crea una fecha en la zona horaria del usuario
 * @param year - Año
 * @param month - Mes (0-11)
 * @param day - Día
 * @returns Date en la zona horaria del usuario
 */
export const createLocalDate = (year: number, month: number, day: number): Date => {
  // Crear la fecha usando el constructor local del usuario
  return new Date(year, month, day, 12, 0, 0, 0);
};

/**
 * Normaliza una fecha para comparación, manejando diferentes formatos
 * @param date - Fecha a normalizar (Date, string, o objeto MongoDB)
 * @returns Date normalizada en zona horaria local
 */
export const normalizeDate = (date: any): Date => {
  // Si es un objeto MongoDB con $date
  if (date && typeof date === 'object' && date.$date) {
    return new Date(date.$date);
  }
  
  // Si es un string ISO
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  // Si ya es un Date
  if (date instanceof Date) {
    return date;
  }
  
  // Fallback
  return new Date(date);
};

/**
 * Compara dos fechas sin considerar la hora, solo la fecha
 * Maneja fechas como strings YYYY-MM-DD para evitar problemas de zona horaria
 * @param date1 - Primera fecha a comparar (Date, string, o objeto MongoDB)
 * @param date2 - Segunda fecha a comparar (Date, string, o objeto MongoDB)
 * @returns true si las fechas son iguales (ignorando la hora)
 */
export const compareDates = (date1: any, date2: any): boolean => {
  // Normalizar ambas fechas
  const normalizedDate1 = normalizeDate(date1);
  const normalizedDate2 = normalizeDate(date2);
  
  // Si ambas son strings YYYY-MM-DD, comparar directamente
  if (typeof date1 === 'string' && typeof date2 === 'string' && 
      date1.match(/^\d{4}-\d{2}-\d{2}$/) && date2.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date1 === date2;
  }
  
  // Comparar año, mes y día
  return normalizedDate1.getFullYear() === normalizedDate2.getFullYear() &&
         normalizedDate1.getMonth() === normalizedDate2.getMonth() &&
         normalizedDate1.getDate() === normalizedDate2.getDate();
};

/**
 * Formatea una fecha a string YYYY-MM-DD en la zona horaria del usuario
 * @param date - Fecha a formatear
 * @returns String en formato YYYY-MM-DD
 */
export const formatDateToString = (date: any): string => {
  const dateObj = normalizeDate(date);
  
  // Usar métodos locales para obtener la fecha en la zona horaria del usuario
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convierte una fecha string a Date en la zona horaria del usuario
 * @param dateString - String de fecha en formato YYYY-MM-DD
 * @returns Date en la zona horaria del usuario
 */
export const parseDateString = (dateString: string): Date => {
  // Crear la fecha al mediodía en la zona horaria local para evitar problemas
  const [year, month, day] = dateString.split('-').map(Number);
  return createLocalDate(year, month - 1, day);
};

/**
 * Verifica si una fecha es hoy en la zona horaria del usuario
 * @param date - Fecha a verificar
 * @returns true si la fecha es hoy
 */
export const isToday = (date: any): boolean => {
  return compareDates(date, new Date());
};

/**
 * Verifica si una fecha está en el mismo mes que otra
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns true si ambas fechas están en el mismo mes
 */
export const isSameMonth = (date1: any, date2: any): boolean => {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

/**
 * Obtiene información de la zona horaria del usuario
 * @returns objeto con información de la zona horaria
 */
export const getTimeZoneInfo = () => {
  const timeZone = getUserTimeZone();
  const offset = getUserTimeZoneOffset();
  const offsetHours = Math.abs(offset) / 60;
  const offsetString = `${offset <= 0 ? '+' : '-'}${String(Math.floor(offsetHours)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
  
  return {
    timeZone,
    offset,
    offsetString,
    isUTC: timeZone === 'UTC'
  };
}; 