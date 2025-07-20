import styles from "./SearchInput.module.css";
import { Search, ChevronDown } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useEffect, useRef, useState } from "react";

interface Option {
  label: string;
  value: string;
}

interface SearchInputProps {
  placeholder: string;
  type?: "text" | "number";
  showSelect?: boolean;
  selectPlaceholder?: string;
  selectOptions?: Option[];
  onSelectChange?: (value: string) => void;
  onInputChange?: (value: string) => void;
}

const SearchInput = ({
  placeholder,
  type = "text",
  showSelect = false,
  selectPlaceholder = "Categoría",
  selectOptions = [],
  onSelectChange,
  onInputChange,
}: SearchInputProps) => {
  const { dark } = useTheme();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [selectWidth, setSelectWidth] = useState<number>(180);

  // Calcular el ancho necesario basado en el texto más largo
  useEffect(() => {
    if (showSelect && selectRef.current) {
      const select = selectRef.current;
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '16px';
      tempSpan.style.fontFamily = 'Encode Sans, sans-serif';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.padding = '12px 44px 12px 12px';
      
      document.body.appendChild(tempSpan);
      
      // Encontrar el texto más largo
      let maxWidth = 0;
      const allTexts = [selectPlaceholder, ...selectOptions.map(opt => opt.label)];
      
      allTexts.forEach(text => {
        tempSpan.textContent = text;
        const width = tempSpan.offsetWidth;
        if (width > maxWidth) {
          maxWidth = width;
        }
      });
      
      document.body.removeChild(tempSpan);
      
      // Establecer el ancho mínimo de 180px o el ancho calculado, lo que sea mayor
      setSelectWidth(Math.max(180, maxWidth + 20)); // +20 para padding extra
    }
  }, [showSelect, selectPlaceholder, selectOptions]);

  return (
    <div className={styles.wrapper}>
      {showSelect && (
        <div className={styles.selectWrapper} style={{ width: selectWidth }}>
          <select
            ref={selectRef}
            className={styles.select}
            onChange={(e) => onSelectChange?.(e.target.value)}
            defaultValue=""
            style={{ width: selectWidth }}
          >
            <option value="" disabled>
              {selectPlaceholder}
            </option>
            {selectOptions.map((option) => (
              <option 
                key={`${option.value}-${option.label}`} 
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={16} 
            className={`${styles.selectIcon} ${dark ? styles.dark : styles.light}`}
          />
        </div>
      )}

      <div className={styles.inputWrapper}>
        <Search className={`${styles.icon} ${dark ? styles.dark : styles.light}`} size={18} />
        <input
          type={type}
          placeholder={placeholder}
          className={styles.input}
          onChange={(e) => onInputChange?.(e.target.value)}
        />
      </div>
    </div>
  );
};

export default SearchInput;