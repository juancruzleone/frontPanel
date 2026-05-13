import React, { useState } from 'react'
import { Package, Plus, Trash2, Info } from 'lucide-react'
import { useInventoryStore } from '../../../store/inventoryStore'
import { useTranslation } from 'react-i18next'
import styles from '../styles/repuestosSelector.module.css'

interface Repuesto {
  itemId: string
  nombre: string
  cantidad: number
  unidad: string
}

interface Props {
  selectedRepuestos: Repuesto[]
  onAdd: (repuesto: Repuesto) => void
  onRemove: (itemId: string) => void
  isOnline: boolean
}

const RepuestosSelector: React.FC<Props> = ({ selectedRepuestos, onAdd, onRemove, isOnline }) => {
  const { t } = useTranslation()
  const { items } = useInventoryStore()
  const [selectedItemId, setSelectedItemId] = useState('')
  const [cantidad, setCantidad] = useState(1)

  const handleAdd = () => {
    if (!selectedItemId || cantidad <= 0) return
    
    const item = items.find(i => i._id === selectedItemId)
    if (!item) return

    onAdd({
      itemId: item._id!,
      nombre: item.name,
      cantidad: cantidad,
      unidad: item.unit
    })
    
    setSelectedItemId('')
    setCantidad(1)
  }

  // Filtrar items que ya están seleccionados
  const availableItems = items.filter(item => 
    !selectedRepuestos.some(r => r.itemId === item._id) && item._id
  )

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <Package size={20} />
        {t('deviceForm.spareParts', 'Repuestos y Consumibles')}
      </h3>
      
      {!isOnline && (
        <div className={styles.offlineNotice}>
          <Info size={16} />
          <span>{t('deviceForm.stockSnapshotNotice', 'Mostrando stock según última sincronización local.')}</span>
        </div>
      )}

      <div className={styles.selectorRow}>
        <select 
          className={styles.select}
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
        >
          <option value="">{t('deviceForm.selectSparePart', 'Seleccionar repuesto...')}</option>
          {availableItems.map(item => (
            <option key={item._id} value={item._id}>
              {item.name} ({item.currentStock} {item.unit} {t('inventory.available', 'disp.')})
            </option>
          ))}
        </select>
        
        <input 
          type="number" 
          className={styles.inputCantidad}
          value={cantidad}
          min="1"
          onChange={(e) => setCantidad(Number(e.target.value))}
          placeholder="Cant."
        />
        
        <button 
          type="button" 
          className={styles.addButton}
          onClick={handleAdd}
          disabled={!selectedItemId}
        >
          <Plus size={20} />
        </button>
      </div>

      {selectedRepuestos.length > 0 && (
        <div className={styles.selectedList}>
          {selectedRepuestos.map(r => (
            <div key={r.itemId} className={styles.selectedItem}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{r.nombre}</span>
                <span className={styles.itemQuantity}>{r.cantidad} {r.unidad}</span>
              </div>
              <button 
                type="button" 
                className={styles.removeButton}
                onClick={() => onRemove(r.itemId)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RepuestosSelector
