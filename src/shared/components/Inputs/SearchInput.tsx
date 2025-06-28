import styles from "./SearchInput.module.css";
import { Search } from "lucide-react";

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
  return (
    <div className={styles.wrapper}>
      {showSelect && (
        <select
          className={styles.select}
          onChange={(e) => onSelectChange?.(e.target.value)}
          defaultValue=""
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
      )}

      <div className={styles.inputWrapper}>
        <Search className={styles.icon} size={18} />
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