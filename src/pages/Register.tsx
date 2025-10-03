import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
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
import { Trash, User, Search } from "lucide-react"
import { useTheme } from "../shared/hooks/useTheme"
import { deleteTechnician } from "../features/auth/register/services/registerServices"
import { useAuthStore } from "../store/authStore"
import { usePersonalTour } from "../features/auth/register/hooks/usePersonalTour"
import { CircleHelp } from "lucide-react"

const Register = () => {
  const { t, i18n } = useTranslation()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const { showModal, responseMessage, isError, closeModal, technicians, loadingTechnicians, fetchTechnicians, addTechnician, showSuccess, showError } = useRegister()

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const token = useAuthStore((state) => state.token)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [technicianToDelete, setTechnicianToDelete] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { tourCompleted, startTour, resetTour, skipTour } = usePersonalTour()

  useEffect(() => {
    fetchTechnicians()
    document.title = t('personal.titlePage')
    // Obtener el id del usuario actual (admin) desde el token o el store si está disponible
    // Aquí asumo que tienes acceso al id del usuario logueado, si no, deberás ajustarlo
    // setUserId(authStore.user?._id)
  }, [fetchTechnicians])

  useEffect(() => {
    if (!tourCompleted && technicians.length >= 0) {
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [tourCompleted, technicians])

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
      showSuccess(message)
    },
    [fetchTechnicians, showSuccess],
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
      showSuccess(t('personal.userDeleted'))
    } catch (err: any) {
      console.error('Error al eliminar técnico:', err)
      showError(err.message || t('personal.errorDeletingUser'))
    } finally {
      setTechnicianToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const handleViewProfile = (technician: any) => {
    navigate(`/perfil/${technician._id || technician.id}`)
  }

  const filteredTechnicians = technicians.filter((tech: any) =>
    tech.userName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('personal.title')}</h1>
        <div className={styles.buttonContainer} data-tour="add-technician-btn">
          <Button title={t('personal.addTechnician')} onClick={handleOpenModal} />
        </div>
      </div>

      {/* Filtro de búsqueda */}
      <div className={styles.searchContainer} data-tour="search-technicians">
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t('personal.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
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
        ) : filteredTechnicians.length === 0 ? (
          <div className={styles.emptyContainer}>
            <Search size={48} className={styles.emptyIcon} />
            <p>{t('personal.noSearchResults')}</p>
            <span className={styles.emptySubtext}>{t('personal.tryDifferentSearch')}</span>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.techniciansTable}>
              <thead>
                <tr>
                  <th>{t('personal.user')}</th>
                  <th>{t('personal.role')}</th>
                  <th>{t('personal.registrationDate')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.map((tech) => (
                  <tr key={tech._id || tech.id}>
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
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          title={t('personal.viewProfile')}
                          data-tooltip={t('personal.viewProfile')}
                          onClick={() => handleViewProfile(tech)}
                        >
                          <User size={20} />
                        </button>
                        <button
                          className={styles.iconButton}
                          title={t('common.delete')}
                          data-tooltip={t('personal.deleteUser')}
                          onClick={() => {
                            setTechnicianToDelete(tech)
                            setIsDeleteModalOpen(true)
                          }}
                          // disabled={userId === (tech._id || tech.id)}
                        >
                          <Trash size={20} />
                        </button>
                      </div>
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

      {/* Modal de perfil */}
      {/* This block was removed as per the edit hint */}

      <ModalSuccess isOpen={showModal && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={showModal && isError} onRequestClose={closeModal} mensaje={responseMessage} />

      {/* Botón flotante del tour */}
      <button
        onClick={tourCompleted ? startTour : skipTour}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
        title={tourCompleted ? t('personal.tour.buttons.restart') : t('personal.tour.buttons.skip')}
      >
        <CircleHelp size={28} />
      </button>
    </div>
  )
}

export default Register
