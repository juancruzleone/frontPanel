import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import styles from './HybridSelect.module.css';

interface Option {
  value: string;
  label: string;
}

interface HybridSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoSize?: boolean;
  name?: string;
  error?: boolean;
  required?: boolean;
  variant?: 'default' | 'compact'; // Nueva prop para variante compacta
}

const HybridSelect: React.FC<HybridSelectProps> = ({
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Seleccionar...",
  className,
  disabled = false,
  autoSize = false,
  name,
  error,
  required = false,
  variant = 'default' // Valor por defecto
}) => {
  const { dark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [selectWidth, setSelectWidth] = useState<number>(180);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  // Calcular el ancho automático si está habilitado
  useEffect(() => {
    if (autoSize && selectRef.current) {
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = variant === 'compact' ? '0.9rem' : '16px';
      tempSpan.style.fontFamily = 'Encode Sans, sans-serif';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.padding = variant === 'compact' ? '12px 40px 12px 12px' : '12px 44px 12px 12px';

      document.body.appendChild(tempSpan);

      let maxWidth = 0;
      const allTexts = [placeholder, ...options.map(opt => opt.label)];

      allTexts.forEach(text => {
        tempSpan.textContent = text;
        const width = tempSpan.offsetWidth;
        if (width > maxWidth) {
          maxWidth = width;
        }
      });

      document.body.removeChild(tempSpan);

      // Para compact, usar el ancho del contenido más un pequeño margen
      // Para default, mantener el mínimo de 180px
      const minWidth = variant === 'compact' ? 0 : 180;
      const extraPadding = variant === 'compact' ? 30 : 20;
      setSelectWidth(Math.max(minWidth, maxWidth + extraPadding));
    }
  }, [options, placeholder, autoSize, variant]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        const wasOpen = isOpen;
        setIsOpen(false);
        setHighlightedIndex(-1);

        // Solo disparar onBlur si el usuario había abierto el dropdown y no seleccionó nada
        if (onBlur && hasBeenOpened && (!value || value === "")) {

          onBlur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur, isOpen, hasBeenOpened, value]);

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

  const wrapperStyle = autoSize ? { width: selectWidth } : {};

  return (
    <div
      className={`${styles.hybridSelectWrapper} ${variant === 'compact' ? styles.compactWrapper : ''} ${className || ''}`}
      ref={selectRef}
      style={wrapperStyle}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
          onChange={() => { }}
        />
      )}
      <div
        className={`${styles.hybridSelect} ${variant === 'compact' ? styles.compact : ''} ${disabled ? styles.disabled : ''} ${error ? styles.error : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className={styles.hybridSelectValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`${styles.hybridSelectIcon} ${dark ? styles.dark : styles.light} ${isOpen ? styles.rotated : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.hybridDropdown} ref={dropdownRef} role="listbox">
          {options
            .filter(option => option.label !== placeholder)
            .map((option, index) => {
              // No mostrar como seleccionada la opción vacía (placeholder)
              const isSelected = value === option.value && option.value !== "";

              return (
                <div
                  key={option.value}
                  className={`${styles.hybridOption} ${highlightedIndex === index ? styles.highlighted : ''
                    } ${isSelected ? styles.selected : ''
                    }`}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                >
                  {option.label}
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={styles.checkIcon}
                    >
                      <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default HybridSelect;
