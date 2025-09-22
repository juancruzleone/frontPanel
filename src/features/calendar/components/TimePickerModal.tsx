import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "../styles/calendar.module.css";

interface TimePickerModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
  title?: string;
  placeholder?: string;
}

const TimePickerModal = ({
  isOpen,
  onRequestClose,
  onTimeSelect,
  selectedTime,
  title,
  placeholder,
}: TimePickerModalProps) => {
  const { t } = useTranslation();
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  useEffect(() => {
    if (selectedTime) {
      const [hour, minute] = selectedTime.split(':').map(Number);
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
  }, [selectedTime]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onTimeSelect(formattedTime);
    onRequestClose();
  };

  const handleClose = () => {
    if (selectedTime) {
      const [hour, minute] = selectedTime.split(':').map(Number);
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
    onRequestClose();
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.datePickerBackdrop} onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}>
      <div className={styles.datePickerModal}>
        <div className={styles.datePickerHeader}>
          <h2 className={styles.datePickerTitle}>{title || t('workOrders.selectTime')}</h2>
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
            <div className={styles.timePickerContainer}>
              <div className={styles.timePickerSection}>
                <h4 className={styles.timePickerLabel}>{t('workOrders.hour')}</h4>
                <div className={styles.timePickerScroll}>
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      className={`
                        ${styles.timePickerItem}
                        ${selectedHour === hour ? styles.timePickerSelected : ''}
                      `}
                      onClick={() => setSelectedHour(hour)}
                    >
                      {hour.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.timePickerSeparator}>:</div>
              <div className={styles.timePickerSection}>
                <h4 className={styles.timePickerLabel}>{t('workOrders.minute')}</h4>
                <div className={styles.timePickerScroll}>
                  {minutes.filter(m => m % 5 === 0).map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      className={`
                        ${styles.timePickerItem}
                        ${selectedMinute === minute ? styles.timePickerSelected : ''}
                      `}
                      onClick={() => setSelectedMinute(minute)}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.selectedDateInfo}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                className={styles.selectedDateIcon}
              >
                <circle cx="12" cy="12" r="10" fill="#10b981"/>
                <polyline points="12,6 12,12 16,14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className={styles.selectedDateText}>
                <p className={styles.selectedDateLabel}>{t('workOrders.selectedTime')}:</p>
                <p className={styles.selectedDateValue}>
                  {formatTime(selectedHour, selectedMinute)}
                </p>
              </div>
            </div>
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

export default TimePickerModal;
