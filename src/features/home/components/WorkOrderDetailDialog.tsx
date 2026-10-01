import { useEffect, useRef } from "react"
import ModalWorkOrderDetails from "../../calendar/components/ModalWorkOrderDetails"
import type { WorkOrder } from "../../calendar/hooks/useCalendar"
import styles from "../styles/home.module.css"

interface WorkOrderDetailDialogProps {
  /** Null closes the dialog; the dashboard renders exactly one of these. */
  workOrder: WorkOrder | null
  onRequestClose: () => void
}

const ignore = (): void => undefined

/**
 * Thin dashboard host for the shared calendar detail modal. The modal itself is
 * reused as-is; this wrapper only adds the keyboard escape hatch and moves the
 * initial focus inside the dialog, so `useWorkOrderDetail` can hand focus back
 * to the row control that opened it.
 */
export const WorkOrderDetailDialog = ({ workOrder, onRequestClose }: WorkOrderDetailDialogProps) => {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!workOrder) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    layerRef.current?.querySelector<HTMLElement>("button")?.focus()
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [workOrder, onRequestClose])

  if (!workOrder) return null

  return (
    <div ref={layerRef} className={styles.detailLayer}>
      <ModalWorkOrderDetails
        isOpen
        workOrder={workOrder}
        onRequestClose={onRequestClose}
        onSuccess={ignore}
        onError={ignore}
      />
    </div>
  )
}
