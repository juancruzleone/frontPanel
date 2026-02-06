import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "../styles/datePickerModal.module.css";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  title?: string;
  placeholder?: string;
}

/**
 * Función para parsear una fecha string YYYY-MM-DD a un objeto Date local
 * sin desplazamientos de zona horaria (UTC shifts).
 */
function parseSafeLocalDate(dateStr: string | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  // Si viene con formato ISO completo, intentar parsear partes
  const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DatePickerModal = ({
  isOpen,
  onRequestClose,
  onDateSelect,
  selectedDate,
  title,
  placeholder,
}: DatePickerModalProps) => {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateState, setSelectedDateState] = useState<Date | null>(
    parseSafeLocalDate(selectedDate)
  );

  useEffect(() => {
    if (selectedDate) {
      const parsed = parseSafeLocalDate(selectedDate);
      setSelectedDateState(parsed);
      // Solo actualizar el mes visual si el modal está abierto o es la primera vez
      if (parsed) {
        setCurrentDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [selectedDate, isOpen]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    // Ajustar al domingo anterior
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    // Asegurar 6 semanas (42 días) para un grid consistente
    while (days.length < 42) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDateState(date);
  };

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (selectedDateState) {
      const formattedDate = formatLocalDate(selectedDateState);
      onDateSelect(formattedDate);
      onRequestClose();
    }
  };

  const handleClose = () => {
    setSelectedDateState(parseSafeLocalDate(selectedDate));
    onRequestClose();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDateState && date.toDateString() === selectedDateState.toDateString();
  };

  const isOtherMonth = (date: Date) => {
    return date.getMonth() !== currentDate.getMonth();
  };

  if (!isOpen) return null;

  const days = generateCalendarDays();
  const currentLanguage = i18n.language || 'es';
  const monthName = currentDate.toLocaleDateString(currentLanguage, { month: "long", year: "numeric" });

  return (
    <div
      className={styles.datePickerBackdrop}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
    >
      <div className={styles.datePickerModal}>
        <div className={styles.datePickerHeader}>
          <div style={{ width: 40 }} />
          <h2 className={styles.datePickerTitle}>{title || t('calendar.selectDate')}</h2>
          <button
            type="button"
            className={styles.datePickerCloseButton}
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className={styles.datePickerContent}>
          <div className={styles.calendarPickerContainer}>
            <div className={styles.calendarPickerHeader}>
              <button type="button" onClick={() => navigateMonth(-1)} className={styles.calendarPickerNavButton}>
                <ChevronLeft size={32} strokeWidth={3} />
              </button>
              <h3 className={styles.calendarPickerMonthTitle}>{monthName}</h3>
              <button type="button" onClick={() => navigateMonth(1)} className={styles.calendarPickerNavButton}>
                <ChevronRight size={32} strokeWidth={3} />
              </button>
            </div>
            <div className={styles.calendarPickerGrid}>
              <div className={styles.calendarPickerWeekDays}>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.sun')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.mon')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.tue')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.wed')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.thu')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.fri')}</div>
                <div className={styles.calendarPickerWeekDay}>{t('calendar.sat')}</div>
              </div>
              <div className={styles.calendarPickerDays}>
                {days.map((day, index) => (
                  <button
                    type="button"
                    key={index}
                    className={`
                      ${styles.calendarPickerDay}
                      ${isOtherMonth(day) ? styles.calendarPickerOtherMonth : ''}
                      ${isSelected(day) ? styles.calendarPickerSelected : ''}
                      ${!isSelected(day) && isToday(day) ? styles.calendarPickerToday : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                  >
                    {day.getDate()}
                  </button>
                ))}
              </div>
            </div>
            {selectedDateState && (
              <div className={styles.selectedDateInfo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.selectedDateIcon}>
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#10b981" />
                  <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className={styles.selectedDateText}>
                  <p className={styles.selectedDateLabel}>{t('calendar.selectedDate')}:</p>
                  <p className={styles.selectedDateValue}>
                    {selectedDateState.toLocaleDateString(currentLanguage, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
            {!selectedDateState && placeholder && (
              <div className={styles.selectedDateInfo}>
                <div className={styles.selectedDateText}>
                  <p className={styles.selectedDateValue}>{placeholder}</p>
                </div>
              </div>
            )}
          </div>
          <div className={styles.datePickerActions}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedDateState}
              className={styles.datePickerConfirmButton}
            >
              {t('common.confirm')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={styles.datePickerCancelButton}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;