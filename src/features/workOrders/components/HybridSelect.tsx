import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../../shared/hooks/useTheme';
import styles from '../styles/workOrderForm.module.css';

interface Option {
  value: string;
  label: string;
}

interface HybridSelectProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  options: Option[];
  placeholder?: string;
  error?: boolean;
  required?: boolean;
}

const HybridSelect: React.FC<HybridSelectProps> = ({
  name,
  value,
  onChange,
  onBlur,
  disabled,
  className,
  options,
  placeholder,
  error,
  required = false
}) => {
  const { dark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        const wasOpen = isOpen;
        setIsOpen(false);
        setHighlightedIndex(-1);
        
        // Solo disparar onBlur si el usuario había abierto el dropdown y no seleccionó nada
        if (onBlur && hasBeenOpened && (!value || value === "")) {
          console.log(`HybridSelect onBlur disparado para: ${name} - usuario abrió dropdown pero no seleccionó`);
          onBlur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur, isOpen, name, hasBeenOpened, value]);

  useEffect(() => {
    if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        setHasBeenOpened(true);
      }
      setIsOpen(!isOpen);
      setHighlightedIndex(-1);
    }
  };

  const handleOptionClick = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    // No disparar onBlur al seleccionar una opción válida
    // onBlur solo debe dispararse cuando realmente se pierde el foco sin seleccionar
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0) {
          handleOptionClick(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        // Cuando el usuario presiona Tab para salir del componente
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (onBlur && hasBeenOpened && (!value || value === "")) {
          // Usar setTimeout para asegurar que el blur se ejecute después del cambio de foco
          setTimeout(() => {
            console.log(`HybridSelect onBlur disparado por Tab para: ${name} - usuario abrió dropdown pero no seleccionó`);
            onBlur();
          }, 0);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHasBeenOpened(true);
        } else {
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
    }
  };

  return (
    <div className={styles.selectWrapper} ref={selectRef}>
      {/* Hidden input for form validation */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
        onChange={() => {}} // Controlled by the select component
      />
      <div
        className={`${styles.select} ${styles.hybridSelect} ${error ? styles.errorInput : ''} ${className || ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-required={required}
      >
        <span className={styles.selectValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`${styles.selectIcon} ${dark ? styles.dark : styles.light} ${isOpen ? styles.rotated : ''}`}
        />
      </div>
      
      {isOpen && (
        <div className={styles.customDropdown} ref={dropdownRef} role="listbox">
          {options.map((option, index) => (
            <div
              key={option.value}
              className={`${styles.customOption} ${
                highlightedIndex === index ? styles.highlighted : ''
              } ${
                value === option.value ? styles.selected : ''
              }`}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
              {value === option.value && (
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={styles.checkIcon}
                >
                  <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HybridSelect;
