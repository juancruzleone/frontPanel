import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../shared/components/Buttons/buttonCreate"
import ModalSuccess from "../features/auth/register/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ModalRegisterClient from "../features/clients/components/ModalRegisterClient"
import ModalEditClient from "../features/clients/components/ModalEditClient"
import ModalConfirmDelete from "../features/clients/components/ModalConfirmDelete"
import ModalAssignInstallations from "../features/clients/components/ModalAssignInstallations"
import styles from "../features/clients/styles/clients.module.css"
import { FiUser } from "react-icons/fi"
import { useClients } from "../features/clients/hooks/useClients"
import { useTranslation } from "react-i18next"
import { Trash, User, Search, Edit, CircleHelp, Building2 } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import { useTheme } from "../shared/hooks/useTheme"
import { deleteClient, assignInstallationsToClient } from "../features/clients/services/clientServices"
import { useAuthStore } from "../store/authStore"
import { useClientsTour } from "../features/clients/hooks/useClientsTour"
import useInstallations from "../features/installations/hooks/useInstallations"
import Skeleton from "../shared/components/Skeleton"
import TourButton from "../shared/components/Buttons/TourButton"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"

const Clients = () => {
    const { t, i18n } = useTranslation()
    const { dark } = useTheme()
    const navigate = useNavigate()
    const { showModal, responseMessage, isError, closeModal, clients, loadingClients, fetchClients, addClient, showSuccess, showError } = useClients()

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const token = useAuthStore((state) => state.token)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [clientToDelete, setClientToDelete] = useState<any>(null)
    const [clientToEdit, setClientToEdit] = useState<any>(null)
    const [clientToAssign, setClientToAssign] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode, isMobile] = useResponsiveView('clients-view', 'cards')
    const { tourCompleted, startTour, resetTour, skipTour } = useClientsTour()
    const { installations, loadInstallations } = useInstallations()

    useEffect(() => {
        fetchClients()
        loadInstallations()
        document.title = t('clients.titlePage')
    }, [fetchClients, loadInstallations])

    useEffect(() => {
        if (!tourCompleted && clients.length >= 0) {
            const timer = setTimeout(() => {
                startTour()
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [tourCompleted, clients])

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
            fetchClients()
            showSuccess(message)
        },
        [fetchClients, showSuccess],
    )

    const handleSuccessEdit = useCallback(
        (message: string) => {
            setIsEditModalOpen(false)
            setClientToEdit(null)
            fetchClients()
            showSuccess(message)
        },
        [fetchClients, showSuccess],
    )

    const handleEditClient = useCallback((client: any) => {
        setClientToEdit(client)
        setIsEditModalOpen(true)
    }, [])

    const handleOpenModal = useCallback(() => {
        setIsRegisterModalOpen(true)
    }, [])

    const handleCloseModal = useCallback(() => {
        setIsRegisterModalOpen(false)
    }, [])

    const handleDeleteClient = async (id: string) => {
        try {
            await deleteClient(id, token)
            await fetchClients()
        } catch (err: any) {
            alert(err.message || 'Error al eliminar cliente')
        }
    }

    const handleConfirmDelete = async () => {
        if (!clientToDelete) return
        try {
            await deleteClient(clientToDelete._id || clientToDelete.id, token)
            await fetchClients()
            showSuccess(t('clients.clientDeleted'))
        } catch (err: any) {
            showError(err.message || t('clients.errorDeletingClient'))
        } finally {
            setClientToDelete(null)
            setIsDeleteModalOpen(false)
        }
    }

    const handleViewProfile = (client: any) => {
        navigate(`/perfil/${client._id || client.id}`)
    }

    const handleAssignInstallations = (client: any) => {
        setClientToAssign(client)
        setIsAssignModalOpen(true)
    }

    const handleSuccessAssign = useCallback(
        (message: string) => {
            setIsAssignModalOpen(false)
            setClientToAssign(null)
            showSuccess(message)
        },
        [showSuccess],
    )

    const handleAssign = async (clientId: string, installationIds: string[]) => {
        try {
            await assignInstallationsToClient(clientId, installationIds, token)
            return { message: t('clients.installationsAssignedSuccessfully') }
        } catch (err: any) {
            throw err
        }
    }

    const filteredClients = clients.filter((client: any) =>
        client.userName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className={styles.container}>
            <div className={styles.topSection}>
                <div className={styles.headerWithToggle}>
                    <h1 className={styles.title}>{t('clients.title')}</h1>
                    {!isMobile && (
                        <ViewToggle 
                            view={viewMode} 
                            onViewChange={setViewMode}
                        />
                    )}
                </div>
                <div className={styles.buttonContainer} data-tour="add-client-btn">
                    <Button title={t('clients.addClient')} onClick={handleOpenModal} />
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className={styles.searchRow}>
                <SearchInput
                    placeholder={t('clients.searchPlaceholder')}
                    onInputChange={(value) => setSearchTerm(value)}
                />
            </div>

            {/* Listado de clientes */}
            <div className={styles.clientsContainer}>
                <h2 className={styles.subtitle}>{t('clients.clientsList')}</h2>

                {loadingClients ? (
                    <div className={styles.loadingContainer}>
                        <Skeleton height={300} width="100%" style={{ borderRadius: 12 }} />
                    </div>
                ) :
                    !Array.isArray(clients) || clients.length === 0 ? (
                        <div className={styles.emptyContainer}>
                            <FiUser size={48} className={styles.emptyIcon} />
                            <p>{t('clients.noClients')}</p>
                            <span className={styles.emptySubtext}>{t('clients.addFirstClient')}</span>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className={styles.emptyContainer}>
                            <Search size={48} className={styles.emptyIcon} />
                            <p>{t('clients.noSearchResults')}</p>
                            <span className={styles.emptySubtext}>{t('clients.tryDifferentSearch')}</span>
                        </div>
                    ) : viewMode === 'table' ? (
                        <div className={styles.tableContainer}>
                            <table className={styles.clientsTable}>
                                <thead>
                                    <tr>
                                        <th>{t('clients.user')}</th>
                                        <th>{t('clients.registrationDate')}</th>
                                        <th>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map((client) => (
                                        <tr key={client._id || client.id}>
                                            <td data-label={t('clients.user')}>
                                                <div className={styles.userInfo}>
                                                    <div className={styles.userAvatar}>
                                                        <FiUser size={16} />
                                                    </div>
                                                    <span>{client.userName}</span>
                                                </div>
                                            </td>
                                            <td data-label={t('clients.registrationDate')}>{formatDate(client.createdAt)}</td>
                                            <td data-label={t('common.actions')}>
                                                <div className={styles.actionButtons}>
                                                    <button
                                                        className={styles.iconButton}
                                                        title={t('clients.assignInstallations')}
                                                        data-tooltip={t('clients.assignInstallations')}
                                                        onClick={() => handleAssignInstallations(client)}
                                                    >
                                                        <Building2 size={20} />
                                                    </button>
                                                    <button
                                                        className={styles.iconButton}
                                                        title={t('clients.editClient')}
                                                        data-tooltip={t('clients.editClient')}
                                                        onClick={() => handleEditClient(client)}
                                                    >
                                                        <Edit size={20} />
                                                    </button>
                                                    <button
                                                        className={styles.iconButton}
                                                        title={t('clients.viewProfile')}
                                                        data-tooltip={t('clients.viewProfile')}
                                                        onClick={() => handleViewProfile(client)}
                                                    >
                                                        <User size={20} />
                                                    </button>
                                                    <button
                                                        className={styles.iconButton}
                                                        title={t('common.delete')}
                                                        data-tooltip={t('clients.deleteClient')}
                                                        onClick={() => {
                                                            setClientToDelete(client)
                                                            setIsDeleteModalOpen(true)
                                                        }}
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
                    ) : (
                        <div className={styles.cardsGrid}>
                            {filteredClients.map((client) => (
                                <div key={client._id || client.id} className={styles.clientCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.userInfo}>
                                            <div className={styles.userAvatar}>
                                                <FiUser size={20} />
                                            </div>
                                            <span className={styles.clientName}>{client.userName}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <p className={styles.cardDate}>
                                            <strong>{t('clients.registrationDate')}:</strong> {formatDate(client.createdAt)}
                                        </p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.iconButton}
                                            title={t('clients.assignInstallations')}
                                            data-tooltip={t('clients.assignInstallations')}
                                            onClick={() => handleAssignInstallations(client)}
                                        >
                                            <Building2 size={20} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            title={t('clients.editClient')}
                                            data-tooltip={t('clients.editClient')}
                                            onClick={() => handleEditClient(client)}
                                        >
                                            <Edit size={20} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            title={t('clients.viewProfile')}
                                            data-tooltip={t('clients.viewProfile')}
                                            onClick={() => handleViewProfile(client)}
                                        >
                                            <User size={20} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            title={t('common.delete')}
                                            data-tooltip={t('clients.deleteClient')}
                                            onClick={() => {
                                                setClientToDelete(client)
                                                setIsDeleteModalOpen(true)
                                            }}
                                        >
                                            <Trash size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>

            {/* Modal para registrar cliente */}
            <ModalRegisterClient
                isOpen={isRegisterModalOpen}
                onRequestClose={handleCloseModal}
                onSubmitSuccess={handleSuccessRegister}
                onAdd={addClient}
            />

            {/* Modal para editar cliente */}
            <ModalEditClient
                isOpen={isEditModalOpen}
                onRequestClose={() => {
                    setIsEditModalOpen(false)
                    setClientToEdit(null)
                }}
                onSubmitSuccess={handleSuccessEdit}
                client={clientToEdit}
            />

            <ModalConfirmDelete
                isOpen={isDeleteModalOpen}
                onCancel={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t('clients.confirmDeleteTitle')}
                description={t('clients.confirmDeleteDescription')}
            />

            <ModalAssignInstallations
                isOpen={isAssignModalOpen}
                onRequestClose={() => {
                    setIsAssignModalOpen(false)
                    setClientToAssign(null)
                }}
                onSubmitSuccess={handleSuccessAssign}
                onAssign={handleAssign}
                client={clientToAssign}
                installations={installations}
            />

            <ModalSuccess isOpen={showModal && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
            <ModalError isOpen={showModal && isError} onRequestClose={closeModal} mensaje={responseMessage} />

            {/* Botón flotante del tour */}
            <TourButton
                onClick={tourCompleted ? startTour : skipTour}
                label={tourCompleted ? t('clients.tour.buttons.restart') : t('clients.tour.buttons.skip')}
            />
        </div>
    )
}

export default Clients
