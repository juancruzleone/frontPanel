"use client"

import { useState, useCallback } from "react"
import {
  fetchWorkOrders,
  startWorkOrder as apiStartWorkOrder,
  assignTechnicianToWorkOrder,
  completeWorkOrder as apiCompleteWorkOrder,
} from "../services/calendarServices"

export type Technician = {
  _id: string
  userName: string
  email?: string
  role: string
}

export type Installation = {
  _id: string
  company: string
  address: string
  city: string
}

export type WorkOrder = {
  _id?: string
  titulo: string
  descripcion: string
  instalacionId: string
  instalacion?: Installation
  dispositivoId?: string
  estado: string
  prioridad: string
  tipoTrabajo: string
  fechaProgramada: Date | string
  horaProgramada: string
  tecnicoAsignado?: string
  tecnico?: Technician | string
  creadoPor?: string
  fechaCreacion?: Date | string
  fechaAsignacion?: Date | string
  fechaInicio?: Date | string
  fechaCompletada?: Date | string
  observaciones?: string
  trabajoRealizado?: string
  materialesUtilizados?: {
    nombre: string
    cantidad: number
    unidad: string
  }[]
  tiempoTrabajo?: number
  estadoDispositivo?: string
  historial?: {
    accion: string
    fecha: Date | string
    usuario: string
    observaciones: string
  }[]
}

const useCalendar = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const workOrdersData = await fetchWorkOrders()
      setWorkOrders(workOrdersData)
    } catch (err: any) {
      console.error("Error al cargar órdenes de trabajo:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const startWorkOrder = async (id: string) => {
    try {
      await apiStartWorkOrder(id)
      setWorkOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, estado: "en_progreso", fechaInicio: new Date() } : o)),
      )
      return { message: "Orden de trabajo iniciada con éxito" }
    } catch (error) {
      console.error("Error al iniciar orden:", error)
      throw error
    }
  }

  const assignTechnician = async (workOrderId: string, technicianId: string) => {
    try {
      await assignTechnicianToWorkOrder(workOrderId, technicianId)
      await loadWorkOrders()
      return { message: "Técnico asignado con éxito" }
    } catch (error) {
      console.error("Error al asignar técnico:", error)
      throw error
    }
  }

  const completeWorkOrder = async (id: string, data: any) => {
    try {
      const result = await apiCompleteWorkOrder(id, data)
      setWorkOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? {
                ...o,
                estado: "completada",
                fechaCompletada: new Date(),
                trabajoRealizado: data.trabajoRealizado,
                observaciones: data.observaciones,
                tiempoTrabajo: data.tiempoTrabajo,
                estadoDispositivo: data.estadoDispositivo,
                ...result,
              }
            : o,
        ),
      )
      return { message: "Orden de trabajo completada con éxito" }
    } catch (error) {
      console.error("Error al completar orden:", error)
      throw error
    }
  }

  return {
    workOrders,
    loading,
    error,
    loadWorkOrders,
    startWorkOrder,
    assignTechnician,
    completeWorkOrder,
  }
}

export default useCalendar
