import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useInstallationTypes from '../../installations/hooks/useInstallationTypes'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalManageInstallationTypes = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { installationTypes, loadInstallationTypes, removeInstallationType, addInstallationType } = useInstallationTypes()
  const [newTypeName, setNewTypeName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadInstallationTypes()
    }
  }, [isOpen])

  const handleAdd = async () => {
    if (!newTypeName.trim()) return
    setIsAdding(true)
    try {
      await addInstallationType({ nombre: newTypeName.trim() })
      setNewTypeName('')
      await loadInstallationTypes()
    } catch (error) {
      console.error('Error al crear tipo:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('settings.confirmDelete'))) {
      try {
        await removeInstallationType(id)
        await loadInstallationTypes()
      } catch (error) {
        console.error('Error al eliminar tipo:', error)
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className={styles.modal}
      overlayClassName={styles.backdrop}
      ariaHideApp={false}
    >
      <div className={styles.modalHeader}>
        <h2>{t('settings.manageInstallationTypes')}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          <X size={24} />
        </button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.addSection}>
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder={t('settings.newTypeName')}
            className={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={isAdding} className={styles.addButton}>
            <Plus size={20} />
          </button>
        </div>

        <div className={styles.itemsList}>
          {installationTypes.map((type) => (
            <div key={type._id} className={styles.item}>
              <span>{type.nombre}</span>
              <button onClick={() => type._id && handleDelete(type._id)} className={styles.deleteButton}>
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default ModalManageInstallationTypes
