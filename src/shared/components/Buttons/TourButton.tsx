import React from 'react'
import { HelpCircle } from 'lucide-react'
import styles from './buttons.module.css'

interface TourButtonProps {
    onClick: () => void
    label: string
}

const TourButton: React.FC<TourButtonProps> = ({ onClick, label }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={styles.tourButton}
            title={label}
            aria-label={label}
        >
            <HelpCircle size={22} aria-hidden="true" />
        </button>
    )
}

export default TourButton
