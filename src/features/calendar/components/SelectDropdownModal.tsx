import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "../styles/calendar.module.css";

interface Option {
  value: string;
  label: string;
}

interface SelectDropdownModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onOptionSelect: (value: string) => void;
  options: Option[];
  selectedValue?: string;
  title?: string;
  placeholder?: string;
}

const SelectDropdownModal = ({
  isOpen,
  onRequestClose,
  onOptionSelect,
  options,
  selectedValue,
  title,
  placeholder,
}: SelectDropdownModalProps) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<string>(selectedValue || "");

  useEffect(() => {
    if (selectedValue) {
      setSelectedOption(selectedValue);
    }
  }, [selectedValue]);

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (selectedOption) {
      onOptionSelect(selectedOption);
      onRequestClose();
    }
  };

  const handleClose = () => {
    setSelectedOption(selectedValue || "");
    onRequestClose();
  };

  const handleOptionClick = (value: string) => {
    setSelectedOption(value);
  };

  const getSelectedLabel = () => {
    const option = options.find(opt => opt.value === selectedOption);
    return option ? option.label : placeholder || t('common.select');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.datePickerBackdrop} onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}>
      <div className={styles.datePickerModal}>
        <div className={styles.datePickerHeader}>
          <h2 className={styles.datePickerTitle}>{title || t('common.selectOption')}</h2>
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
            <div className={styles.selectDropdownContainer}>
              <div className={styles.selectDropdownList}>
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`
                      ${styles.selectDropdownItem}
                      ${selectedOption === option.value ? styles.selectDropdownSelected : ''}
                    `}
                    onClick={() => handleOptionClick(option.value)}
                  >
                    <span className={styles.selectDropdownLabel}>{option.label}</span>
                    {selectedOption === option.value && (
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        className={styles.selectDropdownCheck}
                      >
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {selectedOption && (
              <div className={styles.selectedDateInfo}>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={styles.selectedDateIcon}
                >
                  <polyline points="20,6 9,17 4,12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#10b981"/>
                  <circle cx="12" cy="12" r="10" fill="#10b981"/>
                </svg>
                <div className={styles.selectedDateText}>
                  <p className={styles.selectedDateLabel}>{t('common.selected')}:</p>
                  <p className={styles.selectedDateValue}>
                    {getSelectedLabel()}
                  </p>
                </div>
              </div>
            )}
            {!selectedOption && placeholder && (
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
              disabled={!selectedOption}
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

export default SelectDropdownModal;
