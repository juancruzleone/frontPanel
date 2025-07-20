import { useState, useEffect, useCallback } from "react"
import Button from "../../src/shared/components/Buttons/buttonCreate"
import ModalSuccess from "../features/auth/register/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalRegisterTechnician from "../features/auth/register/components/ModalRegisterTechnician"
import ModalConfirmDelete from "../features/installations/components/ModalConfirmDelete"
import styles from "../features/auth/register/styles/register.module.css"
import { FiUser } from "react-icons/fi"
import { useRegister } from "../features/auth/register/hooks/useRegister.ts"
import { useTranslation } from "react-i18next"
import i18n from "../i18n"
import { translateUserRole } from "../shared/utils/backendTranslations"
import { Trash } from "lucide-react"
import { deleteTechnician } from "../features/auth/register/services/registerServices"
import { useAuthStore } from "../store/authStore"

const Register = () => {
  const { t, i18n } = useTranslation()
  const { showModal, responseMessage, isError, closeModal, technicians, loadingTechnicians, fetchTechnicians, addTechnician } =
    useRegister()

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [technicianToDelete, setTechnicianToDelete] = useState<any>(null)

  useEffect(() => {
    fetchTechnicians()
    document.title = t('personal.titlePage')
    // Obtener el id del usuario actual (admin) desde el token o el store si está disponible
    // Aquí asumo que tienes acceso al id del usuario logueado, si no, deberás ajustarlo
    // setUserId(authStore.user?._id)
  }, [fetchTechnicians, t, i18n.language])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const currentLanguage = i18n.language || 'es'
    return date.toLocaleDateString(currentLanguage, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }, [])

  const handleSuccessRegister = useCallback(
    (message: string) => {
      setIsRegisterModalOpen(false)
      fetchTechnicians()
      closeModal()
      // Mostrar mensaje de éxito después de un pequeño delay
      setTimeout(() => {
        closeModal()
      }, 100)
    },
    [fetchTechnicians, closeModal],
  )

  const handleOpenModal = useCallback(() => {
    setIsRegisterModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsRegisterModalOpen(false)
  }, [])

  const getTranslatedRole = (role: string) => {
    return translateUserRole(role)
  }

  const handleDeleteTechnician = async (id: string) => {
    try {
      await deleteTechnician(id, token)
      await fetchTechnicians()
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario')
    }
  }

  const handleConfirmDelete = async () => {
    if (!technicianToDelete) return
    try {
      await deleteTechnician(technicianToDelete._id || technicianToDelete.id, token)
      await fetchTechnicians()
      // Usar las funciones del hook useRegister para manejar mensajes
      // El mensaje se mostrará a través del ModalSuccess/ModalError existente
    } catch (err: any) {
      console.error('Error al eliminar técnico:', err)
      // El error se manejará a través del sistema existente
    } finally {
      setTechnicianToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('personal.title')}</h1>
        <div className={styles.buttonContainer}>
          <Button title={t('personal.addTechnician')} onClick={handleOpenModal} />
        </div>
      </div>

      {/* Listado de técnicos */}
      <div className={styles.techniciansContainer}>
        <h2 className={styles.subtitle}>{t('personal.techniciansList')}</h2>

        {loadingTechnicians ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{t('personal.loadingTechnicians')}</p>
          </div>
        ) : !Array.isArray(technicians) || technicians.length === 0 ? (
          <div className={styles.emptyContainer}>
            <FiUser size={48} className={styles.emptyIcon} />
            <p>{t('personal.noTechnicians')}</p>
            <span className={styles.emptySubtext}>{t('personal.addFirstTechnician')}</span>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.techniciansTable}>
              <thead>
                <tr>
                  <th>{t('personal.id')}</th>
                  <th>{t('personal.user')}</th>
                  <th>{t('personal.role')}</th>
                  <th>{t('personal.registrationDate')}</th>
                  <th>{t('common.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((tech) => (
                  <tr key={tech._id || tech.id}>
                    <td>
                      <span className={styles.idBadge}>
                        {(tech._id || tech.id)?.toString().slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          <FiUser size={16} />
                        </div>
                        <span>{tech.userName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[tech.role]}`}>
                        {getTranslatedRole(tech.role)}
                      </span>
                    </td>
                    <td>{formatDate(tech.createdAt)}</td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        title={t('common.delete')}
                        data-tooltip={t('personal.deleteUser')}
                        onClick={() => {
                          setTechnicianToDelete(tech)
                          setIsDeleteModalOpen(true)
                        }}
                        // disabled={userId === (tech._id || tech.id)}
                      >
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para registrar técnico */}
      <ModalRegisterTechnician
        isOpen={isRegisterModalOpen}
        onRequestClose={handleCloseModal}
        onSubmitSuccess={handleSuccessRegister}
        onAdd={addTechnician}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('personal.confirmDeleteTitle')}
        description={t('personal.confirmDeleteDescription')}
      />

      <ModalSuccess isOpen={showModal && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={showModal && isError} onRequestClose={closeModal} mensaje={responseMessage} />
    </div>
  )
}

export default Register
