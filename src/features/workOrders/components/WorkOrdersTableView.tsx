import React from 'react'
import { WorkOrder } from '../hooks/useWorkOrders'
import DataTable, { Column } from '../../../components/DataTable/DataTable'
import { translateWorkOrderStatus, translatePriority, translateWorkType } from '../../../shared/utils/backendTranslations'
import { Eye, Play, Check, User, Edit, Trash } from 'lucide-react'
import Tooltip from '../../../shared/components/Tooltip/Tooltip'
import styles from '../styles/workOrders.module.css'

interface WorkOrdersTableViewProps {
  workOrders: WorkOrder[]
  t: (key: string) => string
  permissions: any
  onOpenDetails: (order: WorkOrder) => void
  onStart: (id: string) => void
  onOpenComplete: (order: WorkOrder) => void
  onOpenAssign: (order: WorkOrder) => void
  onOpenEdit: (order: WorkOrder) => void
  onOpenDelete: (order: WorkOrder) => void
  getPriorityColor: (priority: string) => string
}

const WorkOrdersTableView: React.FC<WorkOrdersTableViewProps> = ({
  workOrders,
  t,
  permissions,
  onOpenDetails,
  onStart,
  onOpenComplete,
  onOpenAssign,
  onOpenEdit,
  onOpenDelete,
  getPriorityColor
}) => {
  const columns: Column<WorkOrder>[] = [
    {
      key: 'titulo',
      header: t('workOrders.title'),
      width: '18%'
    },
    {
      key: 'prioridad',
      header: t('workOrders.priority'),
      width: '8%',
      align: 'center',
      render: (order) => (
        <span
          style={{
            backgroundColor: getPriorityColor(order.prioridad),
            color: '#000',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700
          }}
        >
          {translatePriority(order.prioridad)}
        </span>
      )
    },
    {
      key: 'estado',
      header: t('workOrders.status'),
      width: '10%',
      align: 'center',
      render: (order) => (
        <span className={`${styles.statusBadge} ${styles[order.estado]}`}>
          {translateWorkOrderStatus(order.estado)}
        </span>
      )
    },
    {
      key: 'tipoTrabajo',
      header: t('workOrders.type'),
      width: '10%',
      render: (order) => translateWorkType(order.tipoTrabajo)
    },
    {
      key: 'fechaProgramada',
      header: t('calendar.scheduledDate'),
      width: '12%',
      render: (order) => (
        <span style={{ fontSize: '13px' }}>
          {new Date(order.fechaProgramada).toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit',
            year: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'instalacion',
      header: t('workOrders.installation'),
      width: '12%',
      render: (order) => (
        <span style={{ fontSize: '13px' }}>
          {order.instalacion?.company || '-'}
        </span>
      )
    },
    {
      key: 'tecnico',
      header: t('workOrders.assignedTechnician'),
      width: '18%',
      render: (order) => {
        // Soportar múltiples técnicos
        const tecnicos = order.tecnicos && order.tecnicos.length > 0 
          ? order.tecnicos 
          : order.tecnico 
            ? [order.tecnico] 
            : [];

        if (tecnicos.length === 0) {
          return <span style={{ opacity: 0.6, fontSize: '13px' }}>{t('workOrders.notAssigned')}</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tecnicos.slice(0, 2).map((tec: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tec.profilePhoto && (
                  <img 
                    src={tec.profilePhoto} 
                    alt={tec.userName}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--color-card-border)'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  {tec.firstName && tec.lastName 
                    ? `${tec.firstName} ${tec.lastName}` 
                    : tec.userName}
                </span>
              </div>
            ))}
            {tecnicos.length > 2 && (
              <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '26px' }}>
                +{tecnicos.length - 2} más
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: '12%',
      align: 'center',
      render: (order) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Tooltip content={t('workOrders.tooltips.viewDetails')}>
            <button
              className={styles.iconButton}
              onClick={() => onOpenDetails(order)}
              aria-label={t('workOrders.tooltips.viewDetails')}
            >
              <Eye size={16} />
            </button>
          </Tooltip>
          {order.estado === "asignada" && permissions?.canStartWorkOrder && (
            <Tooltip content={t('workOrders.startOrder')}>
              <button
                className={styles.iconButton}
                onClick={() => onStart(order._id!)}
                aria-label={t('workOrders.startOrder')}
              >
                <Play size={16} />
              </button>
            </Tooltip>
          )}
          {order.estado === "en_progreso" && permissions?.canCompleteWorkOrder && (
            <Tooltip content={t('workOrders.completeOrder')}>
              <button
                className={styles.iconButton}
                onClick={() => onOpenComplete(order)}
                aria-label={t('workOrders.completeOrder')}
              >
                <Check size={16} />
              </button>
            </Tooltip>
          )}
          {permissions?.canAssignWorkOrders && ["pendiente", "asignada"].includes(order.estado) && (
            <Tooltip content={t('workOrders.assignTechnician')}>
              <button
                className={styles.iconButton}
                onClick={() => onOpenAssign(order)}
                aria-label={t('workOrders.assignTechnician')}
              >
                <User size={16} />
              </button>
            </Tooltip>
          )}
          {permissions?.canEditWorkOrders && ["pendiente", "asignada"].includes(order.estado) && (
            <Tooltip content={t('workOrders.editOrder')}>
              <button
                className={styles.iconButton}
                onClick={() => onOpenEdit(order)}
                aria-label={t('workOrders.editOrder')}
              >
                <Edit size={16} />
              </button>
            </Tooltip>
          )}
          {permissions?.canDeleteWorkOrders && (
            <Tooltip content={t('workOrders.deleteOrder')}>
              <button
                className={styles.iconButton}
                onClick={() => onOpenDelete(order)}
                aria-label={t('workOrders.deleteOrder')}
              >
                <Trash size={16} />
              </button>
            </Tooltip>
          )}
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={workOrders}
      columns={columns}
      emptyMessage={t('workOrders.noWorkOrdersFound')}
    />
  )
}

export default WorkOrdersTableView
