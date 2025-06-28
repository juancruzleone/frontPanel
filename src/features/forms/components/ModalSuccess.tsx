type ModalSuccessProps = {
  isOpen: boolean
  onRequestClose: () => void
  mensaje: string
}

const ModalSuccess = ({ isOpen, onRequestClose, mensaje }: ModalSuccessProps) => {
  if (!isOpen) return null

  return (
    <div style={modalStyles.backdrop}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.icon}>✅</div>
        <h2 style={modalStyles.title}>¡Operación exitosa!</h2>
        <p style={modalStyles.message}>{mensaje}</p>
        <button style={modalStyles.button} onClick={onRequestClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

const modalStyles = {
  backdrop: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "white",
    borderRadius: "12px",
    padding: "2rem 2.5rem",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center" as const,
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    transition: "all 0.3s ease-in-out",
    animation: "fadeIn 0.3s ease-in-out",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.6rem",
    color: "#2ecc71",
  },
  message: {
    marginBottom: "1.5rem",
    fontSize: "1rem",
    color: "#333",
  },
  button: {
    backgroundColor: "#2ecc71",
    color: "black",
    fontWeight: 500,
    border: "none",
    padding: "0.7rem 1.5rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "background-color 0.2s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
} as const

export default ModalSuccess
