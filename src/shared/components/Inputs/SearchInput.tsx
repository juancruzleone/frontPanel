import styles from "./SearchInput.module.css";
import { Search } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useState } from "react";
import HybridSelect from "../HybridSelect";

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
  value?: string;
  selectValue?: string;
}

const SearchInput = ({
  placeholder,
  type = "text",
  showSelect = false,
  selectPlaceholder = "Categoría",
  selectOptions = [],
  onSelectChange,
  onInputChange,
  value,
  selectValue,
}: SearchInputProps) => {
  const { dark } = useTheme();

  const handleFilterChange = (val: string) => {
    onSelectChange?.(val);
  };

  return (
    <div className={styles.wrapper}>
      {showSelect && (
        <HybridSelect
          value={selectValue || ""}
          onChange={handleFilterChange}
          options={[
            { value: "", label: selectPlaceholder },
            ...selectOptions
          ]}
          placeholder={selectPlaceholder}
          className={styles.filterSelectCustom}
        />
      )}

      <div className={styles.inputWrapper}>
        <Search className={`${styles.icon} ${dark ? styles.dark : styles.light}`} size={18} />
        <input
          type={type}
          placeholder={placeholder}
          className={styles.input}
          value={value || ""}
          onChange={(e) => onInputChange?.(e.target.value)}
        />
      </div>
    </div>
  );
};

export default SearchInput;