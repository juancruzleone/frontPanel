import React from 'react'
import { HelpCircle } from 'lucide-react'
import styles from './buttons.module.css'

interface TourButtonProps {
    onClick: () => void
    label: string
    inline?: boolean
}

const TourButton: React.FC<TourButtonProps> = ({ onClick, label, inline = false }) => {
    return (
        <button
            onClick={onClick}
            className={inline ? styles.tourButtonInline : styles.tourButton}
            title={label}
            aria-label={label}
        >
            <HelpCircle size={inline ? 18 : 28} aria-hidden="true" />
            {inline && <span>{label}</span>}
        </button>
    )
}

export default TourButton
