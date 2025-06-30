"use client"

import { useState } from "react"
import styles from "../styles/Modal.module.css"
import type { WorkOrder } from "../hooks/useCalendar"
import { Clock, MapPin, User, AlertCircle, Calendar, Play } from "lucide-react"

interface ModalWorkOrderDetailsProps {
  isOpen: boolean
  onRequestClose: () => void
  workOrder: WorkOrder | null
  onStart?: (id: string) => Promise<void>
  onSuccess: (message: string) => void
}

const ModalWorkOrderDetails = ({
  isOpen,
  onRequestClose,
  workOrder,
  onStart,
  onSuccess,
}: ModalWorkOrderDetailsProps) => {
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen || !workOrder) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "baja":
        return "#4CAF50"
      case "media":
        return "#FFC107"
      case "alta":
        return "#FF9800"
      case "critica":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "#9E9E9E"
      case "asignada":
        return "#2196F3"
      case "en_progreso":
        return "#FF9800"
      case "completada":
        return "#4CAF50"
      case "cancelada":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const handleStart = async () => {
    if (!onStart || !workOrder._id) return

    setIsLoading(true)
    try {
      await onStart(workOrder._id)
      onSuccess("Orden iniciada con éxito")
    } catch (error) {
      onSuccess("Error al iniciar orden")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Detalles de la Orden de Trabajo</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.workOrderDetails}>
            <div className={styles.headerSection}>
              <h3 className={styles.workOrderTitle}>{workOrder.titulo}</h3>
              <div className={styles.badges}>
                <span
                  className={styles.priorityBadge}
                  style={{ backgroundColor: getPriorityColor(workOrder.prioridad) }}
                >
                  {workOrder.prioridad.toUpperCase()}
                </span>
                <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(workOrder.estado) }}>
                  {workOrder.estado.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h4>Descripción</h4>
              <p>{workOrder.descripcion}</p>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <Calendar size={20} />
                <div>
                  <strong>Fecha Programada</strong>
                  <p>{formatDate(workOrder.fechaProgramada)}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock size={20} />
                <div>
                  <strong>Hora</strong>
                  <p>{workOrder.horaProgramada}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <AlertCircle size={20} />
                <div>
                  <strong>Tipo de Trabajo</strong>
                  <p>{workOrder.tipoTrabajo}</p>
                </div>
              </div>

              {workOrder.instalacion && (
                <div className={styles.infoItem}>
                  <MapPin size={20} />
                  <div>
                    <strong>Instalación</strong>
                    <p>{workOrder.instalacion.company}</p>
                    <p className={styles.address}>
                      {workOrder.instalacion.address}, {workOrder.instalacion.city}
                    </p>
                  </div>
                </div>
              )}

              {workOrder.tecnico && (
                <div className={styles.infoItem}>
                  <User size={20} />
                  <div>
                    <strong>Técnico Asignado</strong>
                    <p>{(workOrder.tecnico as any).userName}</p>
                  </div>
                </div>
              )}
            </div>

            {workOrder.observaciones && (
              <div className={styles.section}>
                <h4>Observaciones</h4>
                <p>{workOrder.observaciones}</p>
              </div>
            )}

            {workOrder.fechaCreacion && (
              <div className={styles.section}>
                <h4>Información Adicional</h4>
                <p>
                  <strong>Creada:</strong> {formatDate(workOrder.fechaCreacion)}
                </p>
                {workOrder.fechaAsignacion && (
                  <p>
                    <strong>Asignada:</strong> {formatDate(workOrder.fechaAsignacion)}
                  </p>
                )}
                {workOrder.fechaInicio && (
                  <p>
                    <strong>Iniciada:</strong> {formatDate(workOrder.fechaInicio)}
                  </p>
                )}
                {workOrder.fechaCompletada && (
                  <p>
                    <strong>Completada:</strong> {formatDate(workOrder.fechaCompletada)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {workOrder.estado === "asignada" && onStart && (
              <button className={styles.startButton} onClick={handleStart} disabled={isLoading}>
                <Play size={16} />
                {isLoading ? "Iniciando..." : "Iniciar Orden"}
              </button>
            )}

            <button className={styles.closeModalButton} onClick={onRequestClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalWorkOrderDetails
