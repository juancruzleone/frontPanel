import { create } from "zustand"
import { persist } from "zustand/middleware"
import { WorkOrder } from "../features/workOrders/hooks/useWorkOrders"

interface WorkOrderState {
  workOrders: WorkOrder[]
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setWorkOrders: (workOrders: WorkOrder[]) => void
  addWorkOrder: (workOrder: WorkOrder) => void
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => void
  removeWorkOrder: (id: string) => void
}

export const useWorkOrderStore = create<WorkOrderState>()(
  persist(
    (set) => ({
      workOrders: [],
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            workOrders: [],
            lastUpdated: null,
          }
        }),
      setWorkOrders: (workOrders) => set({ workOrders, lastUpdated: Date.now() }),
      addWorkOrder: (workOrder) =>
        set((state) => ({
          workOrders: [workOrder, ...state.workOrders],
        })),
      updateWorkOrder: (id, data) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order._id === id ? { ...order, ...data } : order
          ),
        })),
      removeWorkOrder: (id) =>
        set((state) => ({
          workOrders: state.workOrders.filter((order) => order._id !== id),
        })),
    }),
    { name: "work-order-storage" }
  )
)
