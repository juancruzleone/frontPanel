import { useState } from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "../../hooks/useTheme"
import styles from "./buttons.module.css"

const ThemeToggle = () => {
  const { dark, toggleTheme } = useTheme()
  const [isSpinning, setIsSpinning] = useState(false)

  const handleThemeToggle = () => {
    setIsSpinning(true)
    toggleTheme()
    window.setTimeout(() => {
      setIsSpinning(false)
    }, 650)
  }

  return (
    <button
      type="button"
      className={`${styles.themeButton} ${dark ? styles.themeButtonDark : styles.themeButtonLight} ${isSpinning ? styles.themeSpinActive : ''}`}
      onClick={handleThemeToggle}
      aria-label="Cambiar tema"
    >
      <span className={styles.themeIconStack}>
        <Sun size={16} className={`${styles.themeIcon} ${styles.sunIcon}`} />
        <Moon size={16} className={`${styles.themeIcon} ${styles.moonIcon}`} />
      </span>
    </button>
  )
}

export default ThemeToggle 
