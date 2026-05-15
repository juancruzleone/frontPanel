import React, { useState } from "react";
import { WorkOrder } from "../hooks/useWorkOrders";
import {
	translateWorkOrderStatus,
	translatePriority,
} from "../../../shared/utils/backendTranslations";
import {
	Eye,
	Clock,
	MapPin,
	Play,
	Check,
	User,
	Edit,
	Trash,
} from "lucide-react";
import Tooltip from "../../../shared/components/Tooltip/Tooltip";
import styles from "../styles/workOrders.module.css";
import { UserPermissions } from "../../../store/authStore";

interface WorkOrdersKanbanViewProps {
	workOrders: WorkOrder[];
	t: (key: string) => string;
	permissions: UserPermissions | null;
	onOpenDetails: (order: WorkOrder) => void;
	onStart: (id: string) => void;
	onOpenComplete: (order: WorkOrder) => void;
	onOpenAssign: (order: WorkOrder) => void;
	onOpenEdit: (order: WorkOrder) => void;
	onOpenDelete: (order: WorkOrder) => void;
	getPriorityColor: (priority: string) => string;
	onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
	canDragStatus?: (order: WorkOrder) => boolean;
}

const KANBAN_STATUSES = [
	"pendiente",
	"asignada",
	"en_progreso",
	"completada",
	"cancelada",
];

export const WorkOrdersKanbanView: React.FC<WorkOrdersKanbanViewProps> = ({
	workOrders,
	t,
	permissions,
	onOpenDetails,
	onStart,
	onOpenComplete,
	onOpenAssign,
	onOpenEdit,
	onOpenDelete,
	getPriorityColor,
	onStatusChange,
	canDragStatus = () => true,
}) => {
	const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
	const [dropTargetStatus, setDropTargetStatus] = useState<string | null>(null);

	const handleDragStart = (e: React.DragEvent, orderId: string) => {
		setDraggedOrderId(orderId);
		e.dataTransfer.setData("orderId", orderId);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e: React.DragEvent, status: string) => {
		e.preventDefault();
		setDropTargetStatus(status);
	};

	const handleDragLeave = () => {
		setDropTargetStatus(null);
	};

	const handleDrop = async (e: React.DragEvent, newStatus: string) => {
		e.preventDefault();
		const orderId = e.dataTransfer.getData("orderId") || draggedOrderId;
		setDraggedOrderId(null);
		setDropTargetStatus(null);

		if (orderId) {
			const order = workOrders.find((o) => o._id === orderId);
			if (order && order.estado !== newStatus) {
				await onStatusChange(orderId, newStatus);
			}
		}
	};

	const renderCard = (order: WorkOrder) => (
		<div
			key={order._id}
			className={`${styles.kanbanCard} ${draggedOrderId === order._id ? styles.kanbanDragging : ""}`}
			draggable={canDragStatus(order)}
			onDragStart={(e) => handleDragStart(e, order._id!)}
		>
			<div className={styles.kanbanCardHeader}>
				<h4 className={styles.kanbanCardTitle}>{order.titulo}</h4>
				<span
					className={styles.priorityBadge}
					style={{
						backgroundColor: getPriorityColor(order.prioridad),
						color: "#000",
						fontWeight: 700,
					}}
				>
					{translatePriority(order.prioridad)}
				</span>
			</div>

			<div className={styles.kanbanCardMeta}>
				<div className={styles.kanbanMetaItem}>
					<Clock size={14} />
					<span>{new Date(order.fechaProgramada).toLocaleDateString()}</span>
				</div>
				{order.instalacion && (
					<div className={styles.kanbanMetaItem}>
						<MapPin size={14} />
						<span>{order.instalacion.company}</span>
					</div>
				)}
			</div>

			<div className={styles.kanbanCardFooter}>
				<div className={styles.kanbanActions}>
					<Tooltip content={t("workOrders.tooltips.viewDetails")}>
						<button
							className={styles.iconButton}
							onClick={() => onOpenDetails(order)}
						>
							<Eye size={16} />
						</button>
					</Tooltip>

					{order.estado === "asignada" && permissions?.canStartWorkOrder && (
						<Tooltip content={t("workOrders.startOrder")}>
							<button
								className={styles.iconButton}
								onClick={() => onStart(order._id!)}
							>
								<Play size={16} />
							</button>
						</Tooltip>
					)}

					{order.estado === "en_progreso" &&
						permissions?.canCompleteWorkOrder && (
							<Tooltip content={t("workOrders.completeOrder")}>
								<button
									className={styles.iconButton}
									onClick={() => onOpenComplete(order)}
								>
									<Check size={16} />
								</button>
							</Tooltip>
						)}

					{permissions?.canAssignWorkOrders &&
						["pendiente", "asignada"].includes(order.estado) && (
							<Tooltip content={t("workOrders.assignTechnician")}>
								<button
									className={styles.iconButton}
									onClick={() => onOpenAssign(order)}
								>
									<User size={16} />
								</button>
							</Tooltip>
						)}

					{permissions?.canEditWorkOrders &&
						["pendiente", "asignada"].includes(order.estado) && (
							<Tooltip content={t("workOrders.editOrder")}>
								<button
									className={styles.iconButton}
									onClick={() => onOpenEdit(order)}
								>
									<Edit size={16} />
								</button>
							</Tooltip>
						)}

					{permissions?.canDeleteWorkOrders && (
						<Tooltip content={t("workOrders.deleteOrder")}>
							<button
								className={styles.iconButton}
								onClick={() => onOpenDelete(order)}
							>
								<Trash size={16} />
							</button>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div className={styles.kanbanViewport}>
			<div className={styles.kanbanBoard}>
				{KANBAN_STATUSES.map((status) => {
					const ordersInStatus = workOrders.filter((o) => o.estado === status);
					const isDropTarget = dropTargetStatus === status;

					return (
						<div
							key={status}
							className={`${styles.kanbanColumn} ${styles[`column_${status}`]}`}
							onDragOver={(e) => handleDragOver(e, status)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, status)}
						>
							<div className={styles.kanbanColumnHeader}>
								<h3 className={styles.kanbanColumnTitle}>
									{translateWorkOrderStatus(status)}
									<span className={styles.kanbanCount}>
										{ordersInStatus.length}
									</span>
								</h3>
							</div>
							<div
								className={`${styles.kanbanCardsList} ${isDropTarget ? styles.kanbanDropTarget : ""}`}
							>
								{ordersInStatus.length > 0 ? (
									ordersInStatus.map(renderCard)
								) : (
									<div
										style={{
											padding: "20px",
											textAlign: "center",
											opacity: 0.5,
											fontSize: "12px",
										}}
									>
										{t("workOrders.noWorkOrdersFound")}
									</div>
								)}
							</div>
						</div>
					);
				})}
				{/* Spacer to ensure the last column has some breathing room on the right when scrolling */}
				<div className={styles.kanbanSpacer} />
			</div>
		</div>
	);
};

export default WorkOrdersKanbanView;
