import { Sun, Moon } from "lucide-react"
import { useTheme } from "../../hooks/useTheme"
import styles from "./buttons.module.css"

const ThemeToggle = () => {
  const { dark, toggleTheme } = useTheme()

  return (
    <button 
      className={styles.themeButton} 
      onClick={toggleTheme} 
      aria-label="Cambiar tema"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle 