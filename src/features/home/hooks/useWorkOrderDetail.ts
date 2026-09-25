import { useCallback, useRef, useState } from "react"
import type { WorkOrder } from "../../calendar/hooks/useCalendar"
import { getWorkOrderById } from "../../workOrders/services/workOrderServices"
import type { RecentWorkOrderDto } from "../types/homeTypes"

export type WorkOrderDetailStatus = "idle" | "loading" | "ready" | "error"

export interface WorkOrderDetailController {
  /** Id of the order the single dashboard dialog is about, if any. */
  activeId: string | null
  /** Full record for the dialog. The dashboard payload only carries a summary. */
  workOrder: WorkOrder | null
  status: WorkOrderDetailStatus
  openWorkOrder: (order: RecentWorkOrderDto, trigger: HTMLElement) => void
  closeWorkOrder: () => void
  retryWorkOrder: () => void
}

/**
 * Owns the one work-order detail dialog the dashboard can have open at a time.
 * The `/dashboard/stats` row only carries `_id`, `titulo`, `estado`,
 * `fechaCreacion` and `instalacion.company`, so the record is fetched by id
 * before the shared calendar modal renders; nothing is invented locally.
 */
export const useWorkOrderDetail = (): WorkOrderDetailController => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [status, setStatus] = useState<WorkOrderDetailStatus>("idle")
  const triggerRef = useRef<HTMLElement | null>(null)
  const requestIdRef = useRef(0)

  const loadWorkOrder = useCallback(async (id: string) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setStatus("loading")
    try {
      const detail = await getWorkOrderById(id)
      if (requestId !== requestIdRef.current) return
      setWorkOrder(detail)
      setStatus("ready")
    } catch {
      if (requestId !== requestIdRef.current) return
      setWorkOrder(null)
      setStatus("error")
    }
  }, [])

  const openWorkOrder = useCallback((order: RecentWorkOrderDto, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setActiveId(order._id)
    setWorkOrder(null)
    void loadWorkOrder(order._id)
  }, [loadWorkOrder])

  const closeWorkOrder = useCallback(() => {
    requestIdRef.current += 1
    const trigger = triggerRef.current
    triggerRef.current = null
    setActiveId(null)
    setWorkOrder(null)
    setStatus("idle")
    if (trigger?.isConnected) trigger.focus()
  }, [])

  const retryWorkOrder = useCallback(() => {
    if (activeId) void loadWorkOrder(activeId)
  }, [activeId, loadWorkOrder])

  return { activeId, workOrder, status, openWorkOrder, closeWorkOrder, retryWorkOrder }
}
