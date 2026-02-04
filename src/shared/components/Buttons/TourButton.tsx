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
            onClick={onClick}
            className={styles.tourButton}
            title={label}
        >
            <HelpCircle size={28} />
        </button>
    )
}

export default TourButton
