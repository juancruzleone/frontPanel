import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Button from "../shared/components/Buttons/buttonCreate";
import SearchInput from "../shared/components/Inputs/SearchInput";
import styles from "../features/workOrders/styles/workOrders.module.css";
import useWorkOrders, {
	type Technician,
	type WorkOrder,
} from "../features/workOrders/hooks/useWorkOrders";
import { type UserPermissions } from "../store/authStore";
import ModalCreate from "../features/workOrders/components/ModalCreate";
import ModalEdit from "../features/workOrders/components/ModalEdit";
import ModalSuccess from "../features/workOrders/components/ModalSuccess";
import ModalError from "../features/forms/components/ModalError";
import ModalConfirmDelete from "../features/workOrders/components/ModalConfirmDelete";
import ModalAssignTechnician from "../features/workOrders/components/ModalAssignTechnician";
import ModalCompleteWorkOrder from "../features/workOrders/components/ModalCompleteWorkOrder";
import WorkOrdersTableView from "../features/workOrders/components/WorkOrdersTableView";
import WorkOrdersKanbanView from "../features/workOrders/components/WorkOrdersKanbanView";

import {
	Edit,
	Trash,
	User,
	Check,
	Play,
	FilterX,
	Calendar as CalendarIcon,
	MapPin,
	Clock,
	Eye,
} from "lucide-react";
import Skeleton from "../shared/components/Skeleton";
import HybridSelect from "../shared/components/HybridSelect";
import DatePickerModal from "../features/calendar/components/DatePickerModal";
import ModalWorkOrderDetails from "../features/calendar/components/ModalWorkOrderDetails";
import { parseDateString } from "../features/calendar/utils/dateUtils";
import { useTimeZone } from "../features/calendar/hooks/useTimeZone";
import { useTranslation } from "react-i18next";
import {
	translateWorkOrderStatus,
	translatePriority,
	translateWorkType,
	translateOrderType,
	translateOrderOrigin,
} from "../shared/utils/backendTranslations";
import { getTranslatedWorkOrderDescription } from "../shared/utils/workOrderDescription";
import { useAuthStore } from "../store/authStore";
import Tooltip from "../shared/components/Tooltip/Tooltip";
import { socketService } from "../shared/services/socketService";
import ViewToggle from "../components/ViewToggle/ViewToggle";
import {
	useResponsiveView,
	type ViewMode,
} from "../shared/hooks/useResponsiveView";

import { exportWorkOrders, resolveStartWorkOrderErrorKey } from "../features/workOrders/services/workOrderServices";
import { canExportOperationalResults } from "../shared/utils/exportPermissions";
import {
  canRequestCancel,
  canReviewRequest,
  filterMyRequests,
  filterReceivedRequests,
  getPreferredVsScheduled,
  getRequestStatusGroup,
  isClientRequest,
  PRE_EXECUTION_STATES,
} from "../features/workOrders/utils/clientRequestUtils";
import { maintenanceRequestsService } from "../features/maintenanceRequests/services/maintenanceRequestsService";

const WORK_ORDER_ALLOWED_VIEWS: readonly ViewMode[] = [
	"cards",
	"table",
	"kanban",
];

const getRolePermissions = (role: string | null): UserPermissions => {
	const normalizedRole = role?.toLowerCase();
	const isAdmin =
		normalizedRole === "admin" || normalizedRole === "super_admin";
	const isTech = normalizedRole === "tecnico" || normalizedRole === "técnico";

	return {
		canCreateWorkOrders: isAdmin,
		canEditWorkOrders: isAdmin,
		canDeleteWorkOrders: isAdmin,
		canAssignWorkOrders: isAdmin,
		canStartWorkOrder: isTech || isAdmin,
		canCompleteWorkOrder: isTech || isAdmin,
		canViewWorkOrders: true,
	};
};

const normalizeUserPermissions = (
	permissions: string[] | UserPermissions | null,
): UserPermissions => {
	if (!permissions) return {};

	if (Array.isArray(permissions)) {
		return permissions.reduce<UserPermissions>((acc, permission) => {
			acc[permission] = true;
			return acc;
		}, {});
	}

	return permissions;
};

const renderTechnicianInfo = (order: WorkOrder, t: (key: string) => string) => {
	const namesFromTecnicos = Array.isArray(order.tecnicos)
		? order.tecnicos.map((tech) => tech.userName).filter(Boolean)
		: [];
	const namesFromTecnico = Array.isArray(order.tecnico)
		? order.tecnico
				.map((tech) => (tech as Record<string, unknown>)?.userName as string)
				.filter(Boolean)
		: (order.tecnico as Record<string, unknown>)?.userName
			? [(order.tecnico as Record<string, unknown>).userName as string]
			: [];
	const technicianNames = Array.from(
		new Set([...namesFromTecnicos, ...namesFromTecnico]),
	);
	const technicianIds = Array.from(
		new Set(
			[
				...(Array.isArray(order.tecnicosAsignados)
					? order.tecnicosAsignados
					: []),
				...(Array.isArray(order.tecnicosIds) ? order.tecnicosIds : []),
				order.tecnicoAsignado,
			]
				.filter(Boolean)
				.map((id) => String(id)),
		),
	);

	if (technicianNames.length > 0) {
		return (
			<p className={styles.detailItem}>
				<strong>{t("workOrders.technician")}:</strong>{" "}
				{technicianNames.join(", ")}
				{order.estado === "asignada" && (
					<span className={`${styles.technicianState} ${styles.technicianAssigned}`}>
						({t("workOrders.pendingStart")})
					</span>
				)}
				{order.estado === "en_progreso" && (
					<span className={`${styles.technicianState} ${styles.technicianInProgress}`}>
						({t("workOrders.inProgress")})
					</span>
				)}
			</p>
		);
	}

	if (technicianIds.length > 0) {
		return (
			<p className={`${styles.detailItem} ${styles.technicianLoading}`}>
				<strong>{t("workOrders.assignedTechnician")}:</strong> ID{" "}
				{technicianIds.join(", ")}
				<br />
				<small>{t("workOrders.loadingTechnicianDetails")}</small>
			</p>
		);
	}

	return (
		<p className={`${styles.detailItem} ${styles.technicianEmpty}`}>
			{t("workOrders.noTechnicianAssigned")}
		</p>
	);
};

const WorkOrders = () => {
	const { t, i18n } = useTranslation();
	const {
		workOrders,
		pagination,
		loading,
		technicians,
		installations,
		loadingInstallations,
		errorLoadingInstallations,
		loadWorkOrders,
		loadInstallations,
		loadTechnicians,
		addWorkOrder,
		editWorkOrder,
		removeWorkOrder,
		assignTechnician,
		completeWorkOrder,
		startWorkOrder,
		changeWorkOrderStatus,
	} = useWorkOrders();

	const role = useAuthStore((s) => s.role);
	const currentUserId = useAuthStore((s) => s.userId);
	const userPermissions = useAuthStore((s) => s.permissions);

	const permissions = useMemo(
		() => ({
			...getRolePermissions(role),
			...normalizeUserPermissions(userPermissions),
		}),
		[userPermissions, role],
	);

	const [searchParams] = useSearchParams();
	const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get("estado") || "");
	const [selectedPriority, setSelectedPriority] = useState("");
	const [selectedOrigin, setSelectedOrigin] = useState("");
	const [selectedDate, setSelectedDate] = useState("");
	const [selectedDateFilter, setSelectedDateFilter] = useState("");
	const [selectedTechnician, setSelectedTechnician] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [clientTab, setClientTab] = useState<"mine" | "all">("mine");
	const [adminReceivedOnly, setAdminReceivedOnly] = useState(false);
	const [actioningId, setActioningId] = useState<string | null>(null);
	const [searchTermDebounced, setSearchTermDebounced] = useState(searchTerm);

	useEffect(() => {
		const id = window.setTimeout(() => setSearchTermDebounced(searchTerm), 300);
		return () => window.clearTimeout(id);
	}, [searchTerm]);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
	const [initialData, setInitialData] = useState<WorkOrder | null>(null);
	const [responseMessage, setResponseMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrder | null>(
		null,
	);
	const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(
		null,
	);
	const [exportError, setExportError] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [viewMode, setViewMode, isMobile] = useResponsiveView(
		"workorders-view",
		"cards",
		{
			allowedViews: WORK_ORDER_ALLOWED_VIEWS,
		},
	);
	const itemsPerPage = 10;


	const { timeZone, offset } = useTimeZone();

	useEffect(() => {
		document.title = t("workOrders.titlePage");
	}, [t, i18n.language]);

	// Cargar catálogos (solo una vez)
	useEffect(() => {
		loadTechnicians();
		loadInstallations();
	}, []);

	const workOrderFilters = useMemo(() => {
		const filters: Record<string, string | number> = {
			estado: selectedStatus,
			search: searchTermDebounced,
			prioridad: selectedPriority,
			origen: selectedOrigin,
			tecnicoId: selectedTechnician,
			timezone: timeZone,
			offset: offset,
		};

		if (selectedDate) {
			const today = new Date();
			let startDate: Date | null = null;
			let endDate: Date | null = null;

			switch (selectedDate) {
				case "today":
					startDate = today;
					endDate = today;
					break;
				case "thisWeek": {
					const startOfWeek = new Date(today);
					startOfWeek.setDate(today.getDate() - today.getDay());
					startDate = startOfWeek;
					const endOfWeek = new Date(startOfWeek);
					endOfWeek.setDate(startOfWeek.getDate() + 6);
					endDate = endOfWeek;
					break;
				}
				case "thisMonth": {
					const startOfMonth = new Date(
						today.getFullYear(),
						today.getMonth(),
						1,
					);
					const endOfMonth = new Date(
						today.getFullYear(),
						today.getMonth() + 1,
						0,
					);
					startDate = startOfMonth;
					endDate = endOfMonth;
					break;
				}
				case "nextWeek": {
					const nextWeekStart = new Date(today);
					nextWeekStart.setDate(today.getDate() - today.getDay() + 7);
					startDate = nextWeekStart;
					const nextWeekEnd = new Date(nextWeekStart);
					nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
					endDate = nextWeekEnd;
					break;
				}
				case "nextMonth": {
					const nextMonthStart = new Date(
						today.getFullYear(),
						today.getMonth() + 1,
						1,
					);
					startDate = nextMonthStart;
					const nextMonthEnd = new Date(
						today.getFullYear(),
						today.getMonth() + 2,
						0,
					);
					endDate = nextMonthEnd;
					break;
				}
				case "custom":
					if (selectedDateFilter) {
						startDate = parseDateString(selectedDateFilter);
						endDate = parseDateString(selectedDateFilter);
					}
					break;
			}

			if (startDate && endDate) {
				filters.startDate = startDate.toISOString().split("T")[0];
				filters.endDate = endDate.toISOString().split("T")[0];
			}
		}

		// Evita enviar parámetros vacíos en la query (lista y export CSV)
		for (const key of Object.keys(filters)) {
			const value = filters[key];
			if (value === "" || value === null || value === undefined) {
				delete filters[key];
			}
		}

		return filters;
	}, [
		selectedStatus,
		searchTermDebounced,
		selectedPriority,
		selectedOrigin,
		selectedTechnician,
		selectedDate,
		selectedDateFilter,
		timeZone,
		offset,
	]);

	useEffect(() => {
		loadWorkOrders(currentPage, itemsPerPage, workOrderFilters);
	}, [currentPage, workOrderFilters, loadWorkOrders]);

	useEffect(() => {
		const unsubscribe = socketService.onWorkOrdersChanged(() => {
			loadWorkOrders(currentPage, itemsPerPage, workOrderFilters);
		});

		return unsubscribe;
	}, [currentPage, workOrderFilters, loadWorkOrders]);

	const statusOptions = useMemo(
		() => [
			{ label: t("common.all"), value: "" },
			{ label: t("workOrders.requested", { defaultValue: "Solicitada" }), value: "solicitada" },
			{ label: t("workOrders.inReview", { defaultValue: "En revisión" }), value: "en_revision" },
			{ label: t("workOrders.pending"), value: "pendiente" },
			{ label: t("workOrders.assigned"), value: "asignada" },
			{ label: t("workOrders.inProgress"), value: "en_progreso" },
			{ label: t("workOrders.completed"), value: "completada" },
			{ label: t("workOrders.cancelled"), value: "cancelada" },
			{ label: t("workOrders.overdue", { defaultValue: "Vencida" }), value: "vencida" },
		],
		[t],
	);

	const priorityOptions = useMemo(
		() => [
			{
				label: t("calendar.allPriorities") || "Todas las prioridades",
				value: "",
			},
			{ label: t("calendar.low") || "Baja", value: "baja" },
			{ label: t("calendar.medium") || "Media", value: "media" },
			{ label: t("calendar.high") || "Alta", value: "alta" },
			{ label: t("calendar.critical") || "Crítica", value: "critica" },
		],
		[t],
	);

	const originOptions = useMemo(
		() => [
			{
				label: t("workOrders.allOrigins", { defaultValue: "Todos los orígenes" }),
				value: "",
			},
			{ label: t("workOrders.originClientRequest", { defaultValue: "Solicitud de cliente" }), value: "solicitud_cliente" },
			{ label: t("workOrders.originManual", { defaultValue: "Manual" }), value: "manual" },
			{ label: t("workOrders.originMaintenancePlan", { defaultValue: "Plan de mantenimiento" }), value: "plan de mantenimiento" },
			{ label: t("workOrders.originAutoPreventive", { defaultValue: "Preventivo automático" }), value: "preventivo_automatico" },
		],
		[t],
	);

	const dateOptions = useMemo(() => {
		const opts = [
			{ label: t("calendar.allDates") || "Todas las fechas", value: "" },
			{ label: t("calendar.today") || "Hoy", value: "today" },
			{ label: t("calendar.thisWeek") || "Esta semana", value: "thisWeek" },
			{ label: t("calendar.thisMonth") || "Este mes", value: "thisMonth" },
			{ label: t("calendar.nextWeek") || "Próxima semana", value: "nextWeek" },
			{ label: t("calendar.nextMonth") || "Próximo mes", value: "nextMonth" },
			{
				label: t("calendar.selectDate") || "Seleccionar fecha",
				value: "custom",
			},
		];

		if (selectedDate === "custom" && selectedDateFilter) {
			const customOpt = opts.find((o) => o.value === "custom");
			if (customOpt) {
				customOpt.label = parseDateString(
					selectedDateFilter,
				).toLocaleDateString(i18n.language || "es", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				});
			}
		}
		return opts;
	}, [t, selectedDate, selectedDateFilter, i18n.language]);

	const getTechnicianLabel = (tech: Technician) => {
		const label = t(`technicians.${tech.userName}`, tech.userName);
		return typeof label === "string" ? label : tech.userName;
	};

	const totalPages = pagination.totalPages;

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "baja":
				return "#4CAF50";
			case "media":
				return "#FFC107";
			case "alta":
				return "#FF9800";
			case "critica":
				return "#F44336";
			default:
				return "#9E9E9E";
		}
	};

	const handleOpenCreate = () => {
		setInitialData(null);
		setIsCreateModalOpen(true);
	};

	const handleOpenEdit = (order: WorkOrder) => {
		setInitialData({ ...order });
		setIsEditModalOpen(true);
	};

	const handleOpenDetails = (order: WorkOrder) => {
		setSelectedWorkOrder(order);
		setIsDetailsModalOpen(true);
	};

	const handleOpenAssign = (order: WorkOrder) => {
		setSelectedWorkOrder(order);
		setIsAssignModalOpen(true);
	};

	const handleOpenComplete = (order: WorkOrder) => {
		setSelectedWorkOrder(order);
		setIsCompleteModalOpen(true);
	};

	const onSuccess = async (msg: string) => {
		setResponseMessage(msg);
		setIsError(false);
		setIsCreateModalOpen(false);
		setIsEditModalOpen(false);
		setIsAssignModalOpen(false);
		setIsCompleteModalOpen(false);
		setIsDetailsModalOpen(false);
		loadWorkOrders(currentPage, itemsPerPage, workOrderFilters);
	};

	const onError = async (msg: string) => {
		setResponseMessage(msg);
		setIsError(true);
		setIsCreateModalOpen(false);
		setIsEditModalOpen(false);
		setIsAssignModalOpen(false);
		setIsCompleteModalOpen(false);
		setIsDetailsModalOpen(false);
	};

	const closeModal = () => {
		setResponseMessage("");
		setIsError(false);
	};

	const handleOpenDelete = (order: WorkOrder) => {
		setWorkOrderToDelete(order);
		setIsDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!workOrderToDelete?._id) return;

		try {
			await removeWorkOrder(workOrderToDelete._id);
			onSuccess(t("workOrders.workOrderDeleted"));
		} catch (err: unknown) {
			onError((err as Error).message || t("workOrders.errorDeletingWorkOrder"));
		} finally {
			setWorkOrderToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	const handleStart = async (id: string) => {
		try {
			await startWorkOrder(id);
			onSuccess(t("workOrders.workOrderStarted"));
		} catch (err: unknown) {
			onError(t(resolveStartWorkOrderErrorKey(err)));
		}
	};

	const shouldShowEditButton = (order: WorkOrder) => {
		const perms = permissions as UserPermissions | null;
		if (!perms?.canEditWorkOrders) return false;
		return (PRE_EXECUTION_STATES as readonly string[]).includes(order.estado);
	};

	const handleChangePage = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const handleWrappedStart = async (id: string) => {
		// Wrapper for the modal that expects void return but our hook returns object
		await startWorkOrder(id);
	};

	const isTechnicianRole = role === "tecnico" || role === "técnico";
	const isClientRole = role === "cliente";
	const isAdminRole = role === "admin" || role === "super_admin";

	const myRequests = useMemo(
		() => filterMyRequests(workOrders, currentUserId),
		[workOrders, currentUserId],
	);
	const receivedRequests = useMemo(() => filterReceivedRequests(workOrders), [workOrders]);
	const displayedWorkOrders = useMemo(() => {
		if (isClientRole && clientTab === "mine") return myRequests;
		if (isAdminRole && adminReceivedOnly) return workOrders.filter(isClientRequest);
		return workOrders;
	}, [isClientRole, clientTab, myRequests, isAdminRole, adminReceivedOnly, workOrders]);
	const myStats = useMemo(() => {
		const counts = { pendientes: 0, en_proceso: 0, resueltas: 0 };
		for (const order of myRequests) counts[getRequestStatusGroup(order.estado)] += 1;
		return counts;
	}, [myRequests]);

	const handleMarkInReview = async (order: WorkOrder) => {
		if (!order._id || actioningId) return;
		setActioningId(order._id);
		try {
			await changeWorkOrderStatus(order._id, "en_revision");
			onSuccess(t("workOrders.workOrderUpdated"));
		} catch (err: unknown) {
			onError((err as Error).message || t("workOrders.errorUpdatingWorkOrder"));
		} finally {
			setActioningId(null);
		}
	};

	const handleAcceptRequest = async (order: WorkOrder) => {
		if (!order._id || actioningId) return;
		setActioningId(order._id);
		try {
			await changeWorkOrderStatus(order._id, "pendiente");
			setSelectedWorkOrder(order);
			setIsAssignModalOpen(true);
			onSuccess(t("workOrders.workOrderUpdated"));
		} catch (err: unknown) {
			onError((err as Error).message || t("workOrders.errorUpdatingWorkOrder"));
		} finally {
			setActioningId(null);
		}
	};

	const handleRejectRequest = async (order: WorkOrder) => {
		if (!order._id || actioningId) return;
		const motivo = window.prompt(t("workOrders.cancelReason", { defaultValue: "Motivo de la cancelación" }) || "Motivo");
		if (motivo === null) return;
		setActioningId(order._id);
		try {
			await changeWorkOrderStatus(order._id, "cancelada", motivo || undefined);
			onSuccess(t("workOrders.workOrderUpdated"));
		} catch (err: unknown) {
			onError((err as Error).message || t("workOrders.errorUpdatingWorkOrder"));
		} finally {
			setActioningId(null);
		}
	};

	const handleRequestCancel = async (order: WorkOrder) => {
		if (!order._id || actioningId) return;
		const motivo = window.prompt(t("workOrders.cancelReason", { defaultValue: "Motivo de la cancelación" }) || "Motivo");
		if (motivo === null) return;
		setActioningId(order._id);
		try {
			const result = await maintenanceRequestsService.cancelRequest(order._id, motivo || undefined);
			onSuccess(result.message || t("workOrders.cancelRequested"));
		} catch (err: unknown) {
			onError((err as Error).message || t("maintenanceRequests.error.cancelFailed"));
		} finally {
			setActioningId(null);
		}
	};

	const isAssignedToCurrentTechnician = (order: WorkOrder) => {
		if (!currentUserId) return false;
		const assignedIds = [
			...(Array.isArray(order.tecnicosAsignados)
				? order.tecnicosAsignados
				: []),
			...(Array.isArray(order.tecnicosIds) ? order.tecnicosIds : []),
			order.tecnicoAsignado,
		]
			.filter(Boolean)
			.map((id) => String(id));

		return assignedIds.includes(currentUserId);
	};

	const canChangeStatus = (order: WorkOrder) =>
		Boolean(permissions.canEditWorkOrders) ||
		(isTechnicianRole && isAssignedToCurrentTechnician(order));

	const canDragKanbanStatus = (order: WorkOrder) => canChangeStatus(order);

	const handleStatusChange = async (orderId: string, newStatus: string) => {
		const order = displayedWorkOrders.find((o) => o._id === orderId) ?? workOrders.find((o) => o._id === orderId);
		if (!order || order.estado === newStatus) return;

		try {
			if (order.estado === "asignada" && newStatus === "en_progreso") {
				if (!permissions.canStartWorkOrder) {
					throw new Error(
						t("common.noPermission", {
							defaultValue: "No tenés permiso para iniciar esta orden.",
						}),
					);
				}

				await startWorkOrder(orderId);
				onSuccess(t("workOrders.workOrderStarted"));
				return;
			}

			if (order.estado === "en_progreso" && newStatus === "completada") {
				if (!permissions.canCompleteWorkOrder) {
					throw new Error(
						t("common.noPermission", {
							defaultValue: "No tenés permiso para completar esta orden.",
						}),
					);
				}

				handleOpenComplete(order);
				return;
			}

			if (!canChangeStatus(order)) {
				throw new Error(
					t("common.noPermission", {
						defaultValue:
							"No tenés permiso para modificar el estado de esta orden.",
					}),
				);
			}

			await changeWorkOrderStatus(orderId, newStatus);
			onSuccess(t("workOrders.workOrderUpdated"));
		} catch (err: unknown) {
			onError((err as Error).message || t("workOrders.errorUpdatingWorkOrder"));
		}
	};

	useEffect(() => {
		setCurrentPage(1);
	}, [
		searchTerm,
		selectedStatus,
		selectedOrigin,
		selectedPriority,
		selectedDate,
		selectedDateFilter,
		selectedTechnician,
	]);

	return (
		<>
			<div
				className={`${styles.containerWorkOrders} ${viewMode === "kanban" ? styles.kanbanViewMode : ""}`}
			>
				<div className={styles.topSection}>
					<div className={styles.headerWithToggle}>
						<h1 className={styles.title}>{t("workOrders.title")}</h1>
					</div>
					<div className={styles.topActions}>
						{permissions?.canCreateWorkOrders && (
							<div
								className={styles.positionButton}
							>
								<Button
									title={t("workOrders.createWorkOrder")}
									onClick={handleOpenCreate}
								>
									{t("workOrders.createWorkOrder")}
								</Button>
							</div>
						)}
					</div>
				</div>

				<div className={styles.actionsBar}>
					{!isMobile && (
						<div className={styles.viewToggleRow}>
							<ViewToggle view={viewMode} onViewChange={setViewMode} allowedViews={WORK_ORDER_ALLOWED_VIEWS} />
						</div>
					)}
					{canExportOperationalResults(role) && (
						<div className={styles.csvActionsRow}>
							<Button variant="secondary" title={t("workOrders.exportResults")} onClick={async () => {
								setExportError("");
								try { await exportWorkOrders(workOrderFilters); }
								catch (error) { setExportError(error instanceof Error ? error.message : String(error)); }
							}} />
						</div>
					)}
				</div>
				{exportError && <p role="alert">{exportError}</p>}

				{isClientRole && (
					<div className={styles.requestTabs} role="tablist" aria-label={t("workOrders.title")}>
						<button
							type="button"
							role="tab"
							aria-selected={clientTab === "mine"}
							className={`${styles.requestTab} ${clientTab === "mine" ? styles.requestTabActive : ""}`}
							onClick={() => { setClientTab("mine"); setCurrentPage(1); }}
						>
							{t("workOrders.myRequests")} · {myRequests.length}
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={clientTab === "all"}
							className={`${styles.requestTab} ${clientTab === "all" ? styles.requestTabActive : ""}`}
							onClick={() => { setClientTab("all"); setCurrentPage(1); }}
						>
							{t("workOrders.allJobs")} · {workOrders.length}
						</button>
					</div>
				)}
				{isClientRole && clientTab === "mine" && (
					<div className={styles.requestStats}>
						<span>{t("workOrders.statsPending")}: {myStats.pendientes}</span>
						<span>{t("workOrders.statsInProgress")}: {myStats.en_proceso}</span>
						<span>{t("workOrders.statsResolved")}: {myStats.resueltas}</span>
					</div>
				)}
				{isAdminRole && (
					<div className={styles.requestTabs}>
						<button
							type="button"
							aria-pressed={adminReceivedOnly}
							className={`${styles.requestTab} ${adminReceivedOnly ? styles.requestTabActive : ""}`}
							onClick={() => {
								const next = !adminReceivedOnly;
								setAdminReceivedOnly(next);
								setSelectedOrigin(next ? "solicitud_cliente" : "");
								setCurrentPage(1);
							}}
						>
							{t("workOrders.receivedRequests")} · {receivedRequests.length}
						</button>
					</div>
				)}

				<div className={styles.searchRow}>
					<div className={styles.searchContainer}>
						<SearchInput
							placeholder={t("workOrders.searchPlaceholder")}
							showSelect
							selectPlaceholder={t("workOrders.filterByStatus")}
							selectOptions={statusOptions}
							onInputChange={setSearchTerm}
							onSelectChange={setSelectedStatus}
							value={searchTerm}
							selectValue={selectedStatus}
						/>
					</div>
					<button
						onClick={() => {
							setSelectedStatus("");
							setSelectedPriority("");
							setSelectedOrigin("");
							setSelectedDate("");
							setSelectedDateFilter("");
							setSearchTerm("");
							setSelectedTechnician("");
						}}
						className={styles.clearFilters}
						title={t("calendar.clearFilters") || "Limpiar filtros"}
					>
						<FilterX size={20} />
					</button>
				</div>

				<div className={styles.filterContainer}>
					{!isClientRole && (
					<HybridSelect
						value={selectedTechnician}
						onChange={setSelectedTechnician}
						options={[
							{
								value: "",
								label: t("calendar.allTechnicians") || "Todos los técnicos",
							},
							...technicians.map((tech) => ({
								label: getTechnicianLabel(tech),
								value: tech._id,
							})),
						]}
						placeholder={
							t("calendar.filterByTechnician") || "Filtrar por técnico"
						}
						variant="compact"
						className={styles.technicianSelect}
					/>
					)}

					<HybridSelect
						value={selectedOrigin}
						onChange={setSelectedOrigin}
						options={originOptions}
						placeholder={
							t("workOrders.filterByOrigin", { defaultValue: "Filtrar por origen" })
						}
						variant="compact"
						className={styles.prioritySelect}
					/>

					<HybridSelect
						value={selectedPriority}
						onChange={setSelectedPriority}
						options={priorityOptions}
						placeholder={
							t("calendar.filterByPriority") || "Filtrar por prioridad"
						}
						variant="compact"
						className={styles.prioritySelect}
					/>

					<HybridSelect
						value={selectedDate}
						onChange={(val) => {
							if (val === "custom") {
								setIsDatePickerOpen(true);
								setSelectedDate(val);
							} else {
								setSelectedDate(val);
								setSelectedDateFilter("");
							}
						}}
						options={dateOptions}
						placeholder={t("calendar.filterByDate") || "Filtrar por fecha"}
						variant="compact"
						className={styles.dateSelect}
					/>

					<button
						onClick={() => setIsDatePickerOpen(true)}
						className={styles.customDateButton}
						type="button"
					>
						<CalendarIcon size={18} className={styles.dateButtonIcon} />
						{selectedDateFilter ? (
							<span style={{ color: "#10b981", fontWeight: "bold" }}>
								{parseDateString(selectedDateFilter).toLocaleDateString(
									i18n.language || "es",
									{
										day: "2-digit",
										month: "2-digit",
										year: "numeric",
									},
								)}
							</span>
						) : (
							t("calendar.selectDate") || "Seleccionar fecha"
						)}
					</button>
				</div>

				<div className={styles.listContainer}>
					{loading ? (
						<div className={styles.loadingContainer}>
							<div className={styles.skeletonGrid}>
								{[1, 2, 3].map((_, i) => (
									<Skeleton
										key={i}
										height={120}
										width={"100%"}
										style={{ borderRadius: 14 }}
									/>
								))}
							</div>
							<Skeleton
								height={220}
								width={"100%"}
								style={{ borderRadius: 14 }}
							/>
						</div>
					) : workOrders.length === 0 ? (
						<p className={styles.loader}>{t("workOrders.noWorkOrdersFound")}</p>
					) : viewMode === "table" ? (
						<>
							<WorkOrdersTableView
								workOrders={displayedWorkOrders}
								t={t}
								permissions={permissions}
								onOpenDetails={handleOpenDetails}
								onStart={handleStart}
								onOpenComplete={handleOpenComplete}
								onOpenAssign={handleOpenAssign}
								onOpenEdit={handleOpenEdit}
								onOpenDelete={handleOpenDelete}

								getPriorityColor={getPriorityColor}
							/>
							<div className={styles.pagination}>
								<button
									onClick={() => handleChangePage(currentPage - 1)}
									disabled={currentPage === 1}
								>
									{"<"}
								</button>
								<span>
									{t("workOrders.page")} {currentPage} {t("workOrders.of")}{" "}
									{totalPages}
								</span>
								<button
									onClick={() => handleChangePage(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									{">"}
								</button>
							</div>
						</>
					) : viewMode === "kanban" ? (
						<WorkOrdersKanbanView
							workOrders={displayedWorkOrders}
							t={t}
							permissions={permissions}
							onOpenDetails={handleOpenDetails}
							onStart={handleStart}
							onOpenComplete={handleOpenComplete}
							onOpenAssign={handleOpenAssign}
							onOpenEdit={handleOpenEdit}
							onOpenDelete={(order) => {
								setWorkOrderToDelete(order);
								setIsDeleteModalOpen(true);
							}}
							getPriorityColor={getPriorityColor}
							onStatusChange={handleStatusChange}
							canDragStatus={canDragKanbanStatus}
						/>
					) : (
						<>
							{displayedWorkOrders.map((order) => (
								<article key={order._id} className={styles.workOrderCard}>
									<div className={styles.workOrderInfo}>
										<div className={styles.workOrderHeader}>
											<h3 className={styles.workOrderTitle}>{order.titulo}</h3>
											<span
												className={`${styles.priorityBadge} ${styles[`priority_${order.prioridad}`] || ""}`}
											>
												{translatePriority(order.prioridad)}
											</span>
										</div>

										<p className={styles.workOrderDescription}>
											{getTranslatedWorkOrderDescription(order.descripcion, t)}
										</p>

										<div className={styles.workOrderDetails}>
											<p className={styles.detailItem}>
												<strong>{t("workOrders.type")}:</strong>{" "}
												{translateWorkType(order.tipoTrabajo)}
											</p>
											<p className={styles.detailItem}>
												<strong>{t("workOrders.orderType")}:</strong>{" "}
												{translateOrderType(order.tipoOrden || "correctivo")}
											</p>
											<p className={styles.detailItem}>
												<strong>{t("workOrders.origin")}:</strong>{" "}
												{translateOrderOrigin(order.origen || "manual")}
												{order.origen === "solicitud_cliente" && (
													<span
														className={`${styles.statusBadge} ${styles.status_solicitada}`}
														style={{ marginLeft: 8 }}
													>
														{t("workOrders.clientRequestBadge", { defaultValue: "Solicitud de cliente" })}
													</span>
												)}
											</p>
											<div className={styles.statusRow}>
												<strong>{t("workOrders.status")}:</strong>
												<span
													className={`${styles.statusBadge} ${styles[`status_${order.estado}`] || ""}`}
												>
													{translateWorkOrderStatus(order.estado)}
												</span>
											</div>

											<div className={`${styles.detailItem} ${styles.operationalDetail}`}>
												<Clock size={16} />
												<span>
													<strong>
														{t("calendar.scheduledDate") || "Fecha programada"}:{" "}
													</strong>
													{new Date(order.fechaProgramada).toLocaleDateString()}{" "}
													{t("workOrders.at")} {order.horaProgramada}
												</span>
											</div>
											{isClientRequest(order) && (order.fechaPreferida || order.horaPreferida) && (
												<div className={`${styles.detailItem} ${styles.operationalDetail}`}>
													<CalendarIcon size={16} />
													<span>
														<strong>{t("workOrders.preferredDateLabel")}: </strong>
														{getPreferredVsScheduled(order).preferred ?? "—"}
														{order.horaPreferida ? ` ${t("workOrders.at")} ${order.horaPreferida}` : ""}
													</span>
												</div>
											)}
											{isClientRequest(order) && getPreferredVsScheduled(order).areDifferent && (
												<p className={styles.detailItem}>
													<small>{t("workOrders.differentScheduleNote")}</small>
												</p>
											)}

											{order.instalacion && (
												<div className={`${styles.detailItem} ${styles.operationalDetail} ${styles.locationDetail}`}>
													<MapPin size={16} />
													<div className={styles.locationCopy}>
														<span className={styles.locationName}>
															{order.instalacion.company}
														</span>
														<span className={styles.locationAddress}>
															{order.instalacion.address}
														</span>
													</div>
												</div>
											)}
											{renderTechnicianInfo(order, t)}
										</div>
									</div>

									<div className={styles.cardSeparator}></div>

									<div className={styles.cardActions}>
										<div className={styles.actionButtons}>
											<Tooltip
												content={
													t("workOrders.tooltips.viewDetails") || "Ver detalles"
												}
											>
												<button
													className={styles.iconButton}
													onClick={() => handleOpenDetails(order)}
													aria-label={
														t("workOrders.tooltips.viewDetails") ||
														"Ver detalles"
													}
												>
													<Eye size={20} />
												</button>
											</Tooltip>
											{order.estado === "asignada" &&
												permissions?.canStartWorkOrder && (
													<Tooltip content={t("workOrders.startOrder")}>
														<button
															className={styles.iconButton}
															onClick={() => handleStart(order._id!)}
															aria-label={t("workOrders.startOrder")}
														>
															<Play size={20} />
														</button>
													</Tooltip>
												)}
											{order.estado === "en_progreso" &&
												permissions?.canCompleteWorkOrder && (
													<Tooltip content={t("workOrders.completeOrder")}>
														<button
															className={styles.iconButton}
															onClick={() => handleOpenComplete(order)}
															aria-label={t("workOrders.completeOrder")}
														>
															<Check size={20} />
														</button>
													</Tooltip>
												)}
											{isAdminRole && canReviewRequest(order, role) && (
													<>
														<Tooltip content={t("workOrders.reviewMark")}>
															<button className={styles.iconButton} onClick={() => handleMarkInReview(order)} disabled={actioningId === order._id} aria-label={t("workOrders.reviewMark")}>
																<Eye size={20} />
															</button>
														</Tooltip>
														<Tooltip content={t("workOrders.reviewAccept")}>
															<button className={styles.iconButton} onClick={() => handleAcceptRequest(order)} disabled={actioningId === order._id} aria-label={t("workOrders.reviewAccept")}>
																<Check size={20} />
															</button>
														</Tooltip>
														<Tooltip content={t("workOrders.reviewReject")}>
															<button className={styles.iconButton} onClick={() => handleRejectRequest(order)} disabled={actioningId === order._id} aria-label={t("workOrders.reviewReject")}>
																<Trash size={20} />
															</button>
														</Tooltip>
													</>
												)}
												{isClientRole && canRequestCancel(order, role, currentUserId) && (
													<Tooltip content={t("workOrders.requestCancel")}>
														<button className={styles.iconButton} onClick={() => handleRequestCancel(order)} disabled={actioningId === order._id} aria-label={t("workOrders.requestCancel")}>
															<FilterX size={20} />
														</button>
													</Tooltip>
												)}
												{permissions?.canAssignWorkOrders &&
												(PRE_EXECUTION_STATES as readonly string[]).includes(order.estado) && (
													<Tooltip content={t("workOrders.assignTechnician")}>
														<button
															className={styles.iconButton}
															onClick={() => handleOpenAssign(order)}
															aria-label={t("workOrders.assignTechnician")}
														>
															<User size={20} />
														</button>
													</Tooltip>
												)}
											{permissions?.canEditWorkOrders &&
												shouldShowEditButton(order) && (
													<Tooltip content={t("workOrders.editOrder")}>
														<button
															className={styles.iconButton}
															onClick={() => handleOpenEdit(order)}
															aria-label={t("workOrders.editOrder")}
														>
															<Edit size={20} />
														</button>
													</Tooltip>
												)}
											{permissions?.canDeleteWorkOrders && (
												<Tooltip content={t("workOrders.deleteOrder")}>
													<button
														className={styles.iconButton}
														onClick={() => {
															setWorkOrderToDelete(order);
															setIsDeleteModalOpen(true);
														}}
														aria-label={t("workOrders.deleteOrder")}
													>
														<Trash size={20} />
													</button>
												</Tooltip>
											)}
										</div>
									</div>
								</article>
							))}

							<div className={styles.pagination}>
								<button
									onClick={() => handleChangePage(currentPage - 1)}
									disabled={currentPage === 1}
								>
									{"<"}
								</button>
								<span>
									{t("workOrders.page")} {currentPage} {t("workOrders.of")}{" "}
									{totalPages}
								</span>
								<button
									onClick={() => handleChangePage(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									{">"}
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			<ModalCreate
				isOpen={isCreateModalOpen}
				onRequestClose={() => setIsCreateModalOpen(false)}
				onSubmitSuccess={onSuccess}
				onSubmitError={onError}
				onAdd={addWorkOrder}
				installations={installations}
				technicians={technicians}
				loadingInstallations={loadingInstallations}
				errorLoadingInstallations={errorLoadingInstallations}
			/>

			<ModalEdit
				isOpen={isEditModalOpen}
				onRequestClose={() => setIsEditModalOpen(false)}
				onSubmitSuccess={onSuccess}
				onEdit={editWorkOrder}
				initialData={initialData}
				installations={installations}
				technicians={technicians}
				loadingInstallations={loadingInstallations}
				errorLoadingInstallations={errorLoadingInstallations}
			/>

			<ModalAssignTechnician
				isOpen={isAssignModalOpen}
				onRequestClose={() => setIsAssignModalOpen(false)}
				onSubmitSuccess={onSuccess}
				onAssign={assignTechnician}
				workOrder={selectedWorkOrder}
				technicians={technicians}
			/>

			<ModalCompleteWorkOrder
				isOpen={isCompleteModalOpen}
				onRequestClose={() => setIsCompleteModalOpen(false)}
				onSubmitSuccess={onSuccess}
				onComplete={completeWorkOrder}
				workOrder={selectedWorkOrder}
			/>

			<ModalConfirmDelete
				isOpen={isDeleteModalOpen}
				onCancel={() => setIsDeleteModalOpen(false)}
				onConfirm={handleConfirmDelete}
				title={t("workOrders.confirmDeleteWorkOrder")}
				description={t("workOrders.confirmDeleteWorkOrderDescription")}
			/>

			<ModalWorkOrderDetails
				isOpen={isDetailsModalOpen}
				onRequestClose={() => setIsDetailsModalOpen(false)}
				workOrder={selectedWorkOrder}
				onStart={
					permissions?.canStartWorkOrder ? handleWrappedStart : undefined
				}
				onSuccess={onSuccess}
				onError={onError}
			/>

			<ModalSuccess
				isOpen={!!responseMessage && !isError}
				onRequestClose={closeModal}
				mensaje={responseMessage}
			/>

			<ModalError
				isOpen={!!responseMessage && isError}
				onRequestClose={closeModal}
				mensaje={responseMessage}
			/>

			<DatePickerModal
				isOpen={isDatePickerOpen}
				onRequestClose={() => setIsDatePickerOpen(false)}
				onDateSelect={(date) => {
					setSelectedDateFilter(date);
					setSelectedDate("custom");
				}}
				selectedDate={selectedDateFilter}
				title={t("calendar.selectDate") || "Seleccionar fecha"}
			/>
		</>
	);
};

export default WorkOrders;
