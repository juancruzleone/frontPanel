import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import styles from './Tooltip.module.css'

interface TooltipProps {
  content: string
  children: React.ReactElement
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (isVisible && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        })
      }
    }

    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible])

  const handleMouseEnter = () => {
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  const tooltipElement = isVisible ? (
    <div
      className={styles.tooltip}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className={styles.tooltipContent}>{content}</div>
      <div className={styles.tooltipArrow} />
    </div>
  ) : null

  return (
    <>
      {React.cloneElement(children as any, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      })}
      {/* Use createPortal to render outside the current DOM hierarchy */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(tooltipElement, document.body)}
    </>
  )
}

export default Tooltip
