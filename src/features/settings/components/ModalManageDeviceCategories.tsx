import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useCategories from '../../installations/hooks/useCategories'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalManageDeviceCategories = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { categories, loadCategories, addCategory, removeCategory } = useCategories()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return
    setIsAdding(true)
    try {
      await addCategory({ nombre: newCategoryName.trim() })
      setNewCategoryName('')
      await loadCategories()
    } catch (error) {
      console.error('Error al crear categoría:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (categoryName: string) => {
    if (window.confirm(t('settings.confirmDelete'))) {
      try {
        await removeCategory(categoryName)
        await loadCategories()
      } catch (error) {
        console.error('Error al eliminar categoría:', error)
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
        <h2>{t('settings.manageDeviceCategories')}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          <X size={24} />
        </button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.addSection}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t('settings.newCategoryName')}
            className={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={isAdding} className={styles.addButton}>
            <Plus size={20} />
          </button>
        </div>

        <div className={styles.itemsList}>
          {categories.map((category) => (
            <div key={category._id} className={styles.item}>
              <span>{category.nombre}</span>
              <button
                onClick={() => category._id && handleDelete(category._id)}
                className={styles.deleteButton}
                title={t('common.delete')}
              >
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default ModalManageDeviceCategories
