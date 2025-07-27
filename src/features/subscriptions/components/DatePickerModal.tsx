import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "../styles/datePickerModal.module.css";

interface DatePickerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  title?: string;
  placeholder?: string;
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
    selectedDate ? new Date(selectedDate) : null
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setSelectedDateState(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Resetear el estado de interacción cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setHasUserInteracted(false);
    }
  }, [isOpen]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= lastDay || days.length < 42) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    setHasUserInteracted(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDateState(date);
    setHasUserInteracted(true);
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
    // Si el usuario interactuó pero no seleccionó fecha, resetear el estado
    if (hasUserInteracted && !selectedDate) {
      setSelectedDateState(null);
    } else {
      setSelectedDateState(selectedDate ? new Date(selectedDate) : null);
    }
    onRequestClose();
  };

  // Handler para cerrar con click fuera del modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
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
      onClick={handleBackdropClick}
      onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
    >
      <div className={styles.datePickerModal}>
        <div className={styles.datePickerHeader}>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h3 className={styles.calendarPickerMonthTitle}>{monthName}</h3>
              <button type="button" onClick={() => navigateMonth(1)} className={styles.calendarPickerNavButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className={styles.calendarPickerGrid}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className={styles.calendarPickerWeekDay}>
                  {day}
                </div>
              ))}
              
              {days.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`${styles.calendarPickerDay} ${
                    isToday(day) ? styles.calendarPickerToday : ''
                  } ${
                    isSelected(day) ? styles.calendarPickerSelected : ''
                  } ${
                    isOtherMonth(day) ? styles.calendarPickerOtherMonth : ''
                  }`}
                >
                  {day.getDate()}
                </button>
              ))}
            </div>
            
            {selectedDateState && (
              <div className={styles.selectedDateInfo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.selectedDateIcon}>
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#10b981"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className={styles.selectedDateText}>
                  <p className={styles.selectedDateLabel}>{t('calendar.selectedDate')}:</p>
                  <p className={styles.selectedDateValue}>
                    {selectedDateState
                      ? selectedDateState.toLocaleDateString(currentLanguage, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : (placeholder || '')}
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
              onClick={handleClose}
              className={styles.datePickerCancelButton}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedDateState}
              className={styles.datePickerConfirmButton}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;