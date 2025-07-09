import React from "react"
import { Plus } from "lucide-react"
import styles from "./buttons.module.css"

interface ButtonCreateProps {
  onClick: () => void
  children?: React.ReactNode
  className?: string
  text?: string
}

const ButtonCreate: React.FC<ButtonCreateProps> = ({ onClick, children, className = "", text }) => {
  return (
    <button 
      className={`${styles.createButton} ${className}`} 
      onClick={onClick}
    >
      <Plus size={14} />
      {text || children || "Crear"}
    </button>
  )
}

export default ButtonCreate