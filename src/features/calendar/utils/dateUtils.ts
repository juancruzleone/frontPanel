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
 * Compara dos fechas sin considerar la hora, solo la fecha
 * Maneja fechas como strings YYYY-MM-DD para evitar problemas de zona horaria
 * @param date1 - Primera fecha a comparar (Date o string YYYY-MM-DD)
 * @param date2 - Segunda fecha a comparar (Date o string YYYY-MM-DD)
 * @returns true si las fechas son iguales (ignorando la hora)
 */
export const compareDates = (date1: Date | string, date2: Date | string): boolean => {
  // Si ambas son strings YYYY-MM-DD, comparar directamente
  if (typeof date1 === 'string' && typeof date2 === 'string') {
    return date1 === date2;
  }
  
  // Si una es string y otra es Date, convertir la string a Date local
  if (typeof date1 === 'string') {
    const [year, month, day] = date1.split('-').map(Number);
    const localDate1 = new Date(year, month - 1, day, 12, 0, 0, 0);
    const date2AsDate = date2 as Date;
    return localDate1.getFullYear() === date2AsDate.getFullYear() &&
           localDate1.getMonth() === date2AsDate.getMonth() &&
           localDate1.getDate() === date2AsDate.getDate();
  }
  
  if (typeof date2 === 'string') {
    const [year, month, day] = date2.split('-').map(Number);
    const localDate2 = new Date(year, month - 1, day, 12, 0, 0, 0);
    const date1AsDate = date1 as Date;
    return date1AsDate.getFullYear() === localDate2.getFullYear() &&
           date1AsDate.getMonth() === localDate2.getMonth() &&
           date1AsDate.getDate() === localDate2.getDate();
  }
  
  // Si ambas son Date, comparar normalmente
  const date1AsDate = date1 as Date;
  const date2AsDate = date2 as Date;
  return date1AsDate.getFullYear() === date2AsDate.getFullYear() &&
         date1AsDate.getMonth() === date2AsDate.getMonth() &&
         date1AsDate.getDate() === date2AsDate.getDate();
};

/**
 * Formatea una fecha a string YYYY-MM-DD en la zona horaria del usuario
 * @param date - Fecha a formatear
 * @returns String en formato YYYY-MM-DD
 */
export const formatDateToString = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
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
export const isToday = (date: Date | string): boolean => {
  return compareDates(date, new Date());
};

/**
 * Verifica si una fecha está en el mismo mes que otra
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns true si ambas fechas están en el mismo mes
 */
export const isSameMonth = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
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