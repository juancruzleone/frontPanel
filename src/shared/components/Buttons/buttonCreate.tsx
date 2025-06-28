import styles from "./buttons.module.css"

interface Props{
    title: string;
    onClick?:() => void
    type?: "button" | "submit" | "reset"
    disabled?: boolean
}

const Button = ({title, onClick, type = "button", disabled = false}: Props) => {
    return(
        <button
            type={type}
            className={styles.buttons}
            onClick={onClick}
            disabled={disabled}
        >
            {title}
        </button>
    )

}

export default Button