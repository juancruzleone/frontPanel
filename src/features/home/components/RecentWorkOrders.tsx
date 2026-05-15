import React from "react";
import styles from "../styles/home.module.css";
import { useTranslation } from "react-i18next";
import { Building2, Calendar } from "lucide-react";

interface WorkOrder {
	_id: string;
	titulo: string;
	estado: string;
	instalacion?: { company: string };
	fechaCreacion?: string;
}

interface RecentWorkOrdersProps {
	workOrders: WorkOrder[];
}

const estadoStyle: Record<string, { backgroundColor: string; color: string }> =
	{
		pendiente: { backgroundColor: "#FFD600", color: "#111111" },
		asignada: { backgroundColor: "#00B8D9", color: "#111111" },
		en_progreso: { backgroundColor: "#FF9100", color: "#111111" },
		completada: { backgroundColor: "#00C853", color: "#111111" },
		cancelada: { backgroundColor: "#D50000", color: "#FFFFFF" },
	};

const RecentWorkOrders: React.FC<RecentWorkOrdersProps> = ({ workOrders }) => {
	const { t } = useTranslation();

	const estadoLabels: Record<string, string> = {
		pendiente: t("workOrders.pending"),
		asignada: t("workOrders.assigned"),
		en_progreso: t("workOrders.inProgress"),
		completada: t("workOrders.completed"),
		cancelada: t("workOrders.cancelled"),
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	return (
		<div
			className={styles.ordersList}
			role="region"
			aria-label={t("home.recentOrders")}
		>
			{workOrders.length === 0 ? (
				<div className={styles.noOrders} role="status">
					<p>{t("home.noRecentOrders")}</p>
					<small>{t("home.ordersWillAppear")}</small>
				</div>
			) : (
				workOrders.map((order) => (
					<div
						className={styles.orderItem}
						key={order._id}
						role="article"
						aria-label={`${t("workOrders.title")}: ${order.titulo}, ${t("workOrders.status")}: ${estadoLabels[order.estado] || order.estado}`}
					>
						<div className={styles.orderHeader}>
							<div className={styles.orderTitle}>{order.titulo}</div>
							<span
								className={styles.orderStatus}
								style={{
									...(estadoStyle[order.estado] || {
										backgroundColor: "#212121",
										color: "#FFFFFF",
									}),
								}}
							>
								{estadoLabels[order.estado] || order.estado}
							</span>
						</div>

						<div className={styles.orderMeta}>
							<div className={styles.orderInfo}>
								<span className={styles.orderInst}>
									<Building2
										size={16}
										style={{ marginRight: "6px", verticalAlign: "middle" }}
									/>
									{order.instalacion?.company || t("workOrders.noInstallation")}
								</span>
								<span className={styles.orderDate}>
									<Calendar
										size={16}
										style={{ marginRight: "6px", verticalAlign: "middle" }}
									/>
									{formatDate(order.fechaCreacion || "")}
								</span>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
};

export default RecentWorkOrders;
