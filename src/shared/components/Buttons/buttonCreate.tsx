import React from "react"
import styles from "./buttons.module.css"

interface ButtonCreateProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void
  children?: React.ReactNode
  className?: string
  text?: string
  title?: string
}

const ButtonCreate: React.FC<ButtonCreateProps> = ({ onClick, children, className = "", text, title, ...rest }) => {
  return (
    <button 
      className={`${styles.createButton} ${className}`} 
      onClick={onClick}
      {...rest}
    >
      {children || title || text || "Crear"}
    </button>
  )
}

export default ButtonCreate