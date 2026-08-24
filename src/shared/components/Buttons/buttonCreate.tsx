import React from "react"
import styles from "./buttons.module.css"

interface ButtonCreateProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void
  children?: React.ReactNode
  className?: string
  text?: string
  title?: string
  variant?: "primary" | "secondary"
}

const ButtonCreate: React.FC<ButtonCreateProps> = ({ onClick, children, className = "", text, title, variant = "primary", ...rest }) => {
  const variantClass = variant === "secondary" ? styles.secondaryButton : styles.createButton
  return (
    <button
      className={`${variantClass} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children || title || text || "Crear"}
    </button>
  )
}

export default ButtonCreate