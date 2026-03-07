import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useAssets from '../../assets/hooks/useAssets'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalManageAssetCategories = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { categories, loadAssets } = useAssets()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAssets({ page: 1, limit: 100 })
    }
  }, [isOpen])

  const handleAdd = async () => {
    if (!newCategoryName.trim()) return
    setIsAdding(true)
    try {
      // Aquí deberías implementar la lógica para agregar categoría de activos
      setNewCategoryName('')
      await loadAssets({ page: 1, limit: 100 })
    } catch (error) {
      console.error('Error al crear categoría:', error)
    } finally {
      setIsAdding(false)
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
        <h2>{t('settings.manageAssetCategories')}</h2>
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
          {categories.map((category, index) => (
            <div key={index} className={styles.item}>
              <span>{category}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default ModalManageAssetCategories
