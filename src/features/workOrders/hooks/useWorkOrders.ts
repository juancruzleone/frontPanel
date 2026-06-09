import type React from "react";
import { useState, useCallback, useMemo } from "react";
import { useWorkOrderStore } from "../../../store/workOrderStore";
import { useOfflineStore } from "../../../store/offlineStore";
import { useInstallationStore } from "../../../store/installationStore";
import { useAuthStore } from "../../../store/authStore";
import {
	fetchWorkOrders,
	createWorkOrder,
	updateWorkOrder,
	updateWorkOrderStatus as apiUpdateWorkOrderStatus,
	deleteWorkOrder,
	assignTechnicianToWorkOrder,
	completeWorkOrder as apiCompleteWorkOrder,
	startWorkOrder as apiStartWorkOrder,
	fetchInstallations as apiFetchInstallations,
} from "../services/workOrderServices";
import { fetchTechnicians } from "../services/technicianServices";
import { validateWorkOrderForm } from "../validators/workOrderValidations";
import { useTranslation } from "react-i18next";
import { useTimeZone } from "../../calendar/hooks/useTimeZone";
import { isOfflineError } from "../../../shared/utils/errorHelpers";

export type Technician = {
	_id: string;
	userName: string;
	email?: string;
	role: string;
	firstName?: string;
	lastName?: string;
	profilePhoto?: string;
};

export type Installation = {
	_id: string;
	company: string;
	address: string;
	city?: string;
	devices?: Device[];
};

export type Device = {
	_id: string;
	nombre: string;
	ubicacion: string;
	categoria: string;
	templateId?: string;
};

export type WorkOrder = {
	_id?: string;
	titulo: string;
	descripcion: string;
	instalacionId: string;
	instalacion?: Installation;
	dispositivoId?: string;
	dispositivo?: Device;
	estado: string;
	prioridad: string;
	tipoTrabajo: string;
	tipoOrden?: string;
	origen?: string;
	fechaProgramada: Date | string;
	horaProgramada: string;
	tecnicoAsignado?: string;
	tecnicosAsignados?: string[];
	tecnicosIds?: string[];
	tecnico?: Technician | Technician[] | string;
	tecnicos?: Technician[];
	creadoPor?: string;
	fechaCreacion?: Date | string;
	fechaAsignacion?: Date | string;
	fechaInicio?: Date | string;
	fechaCompletada?: Date | string;
	observaciones?: string;
	trabajoRealizado?: string;
	materialesUtilizados?: {
		nombre: string;
		cantidad: number;
		unidad: string;
	}[];
	inventoryPartsUsed?: {
		inventoryItemId: string;
		nameSnapshot: string;
		unit: string;
		quantity: number;
		movementId?: string;
	}[];
	tiempoTrabajo?: number;
	estadoDispositivo?: string;
	evidenciaFoto?: string;
	firmaTecnico?: string;
	formularioRespuestas?: Record<string, unknown>;
	fechaInicioOffline?: Date | string;
	fechaCompletadaOffline?: Date | string;
	fechaEjecucionOffline?: Date | string;
	timezone?: string;
	userOffset?: number;
	offlineSync?: boolean;
	pdfUrl?: string;
	historial?: {
		accion: string;
		fecha: Date | string;
		usuario: string;
		observaciones: string;
	}[];
};

const useWorkOrders = () => {
	const userId = useAuthStore((state) => state.userId);
	const {
		workOrders: storedWorkOrders,
		lastUpdated,
		ownerId,
		setWorkOrders,
		addWorkOrder: storeAddWorkOrder,
		updateWorkOrder: storeUpdateWorkOrder,
		removeWorkOrder: storeRemoveWorkOrder,
	} = useWorkOrderStore();

	const validStoredWorkOrders = userId && ownerId === userId ? storedWorkOrders : [];

	const { addToQueue, queue } = useOfflineStore();

	const [filteredOfflineOrders, setFilteredOfflineOrders] = useState<
		WorkOrder[] | null
	>(null);

	const [pagination, setPagination] = useState({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 1,
	});
	const [technicians, setTechnicians] = useState<Technician[]>([]);
	const [installations, setInstallations] = useState<Installation[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingInstallations, setLoadingInstallations] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [errorLoadingInstallations, setErrorLoadingInstallations] = useState<
		string | null
	>(null);

	const [formData, setFormData] = useState<Omit<WorkOrder, "_id">>({
		titulo: "",
		descripcion: "",
		instalacionId: "",
		estado: "pendiente",
		prioridad: "media",
		tipoTrabajo: "mantenimiento",
		tipoOrden: "correctivo",
		origen: "manual",
		fechaProgramada: new Date().toISOString().split("T")[0], // YYYY-MM-DD
		horaProgramada: "09:00",
		observaciones: "",
		tecnicoAsignado: "",
		tecnicosAsignados: [],
		tecnicosIds: [],
	});

	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { t } = useTranslation();

	const normalizeTechnicianIds = useCallback(
		(data: Partial<WorkOrder> | WorkOrder) => {
			const candidates = [
				...(Array.isArray(data?.tecnicosAsignados)
					? data.tecnicosAsignados
					: []),
				...(Array.isArray(data?.tecnicosIds) ? data.tecnicosIds : []),
				data?.tecnicoAsignado,
			];

			return Array.from(
				new Set(candidates.filter(Boolean).map((id) => String(id))),
			);
		},
		[],
	);

	const loadTechnicians = useCallback(async () => {
		try {
			const data = await fetchTechnicians();
			setTechnicians(data);
			return data;
		} catch (err) {
			// Error loading technicians
			setTechnicians([]);
			return [];
		}
	}, []);

	const loadWorkOrders = useCallback(
		async (
			page = 1,
			limit = 10,
			filters: Record<string, string | number> = {},
		) => {
			const { workOrders: currentStored, ownerId: currentOwnerId } =
				useWorkOrderStore.getState();
			const { userId: currentUserId } = useAuthStore.getState();
			const currentValidStored =
				currentUserId && currentOwnerId === currentUserId ? currentStored : [];

			setLoading(true);
			setError(null);
			try {
				if (!navigator.onLine) {
					// Use cache if offline and apply local filtering
					let filtered = [...currentValidStored];
					if (filters.estado)
						filtered = filtered.filter((w) => w.estado === filters.estado);
					if (filters.prioridad)
						filtered = filtered.filter(
							(w) => w.prioridad === filters.prioridad,
						);
					if (filters.search && typeof filters.search === "string") {
						const s = filters.search.toLowerCase();
						filtered = filtered.filter(
							(w) =>
								w.titulo.toLowerCase().includes(s) ||
								w.descripcion.toLowerCase().includes(s),
						);
					}

					const total = filtered.length;
					const startIndex = (page - 1) * limit;
					const paged = filtered.slice(startIndex, startIndex + limit);

					setFilteredOfflineOrders(paged);
					setPagination({
						total,
						page,
						limit,
						totalPages: Math.ceil(total / limit) || 1,
					});
					setLoading(false);
					return;
				}

				const { data, pagination: pagData } = await fetchWorkOrders(
					page,
					limit,
					filters,
				);
				setFilteredOfflineOrders(null);
				setWorkOrders(data);
				setPagination(pagData);
			} catch (err: unknown) {
				if (!navigator.onLine || currentValidStored.length > 0) {
					let filtered = [...currentValidStored];
					if (filters.estado)
						filtered = filtered.filter((w) => w.estado === filters.estado);
					if (filters.prioridad)
						filtered = filtered.filter(
							(w) => w.prioridad === filters.prioridad,
						);
					if (filters.search && typeof filters.search === "string") {
						const s = filters.search.toLowerCase();
						filtered = filtered.filter(
							(w) =>
								w.titulo.toLowerCase().includes(s) ||
								w.descripcion.toLowerCase().includes(s),
						);
					}

					const total = filtered.length;
					const startIndex = (page - 1) * limit;
					const paged = filtered.slice(startIndex, startIndex + limit);

					setFilteredOfflineOrders(paged);
					setPagination({
						total,
						page,
						limit,
						totalPages: Math.ceil(total / limit) || 1,
					});
					setLoading(false);
					return;
				}
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setLoading(false);
			}
		},
		[setWorkOrders],
	);

	const loadInstallations = useCallback(async () => {
		setLoadingInstallations(true);
		setErrorLoadingInstallations(null);
		try {
			const data = await apiFetchInstallations();
			setInstallations(data);
		} catch (err: unknown) {
			if (installations.length > 0) {
				return;
			}
			const storeState = useInstallationStore.getState();
			const storeInst = storeState.installations;
			const { userId: currentUserId } = useAuthStore.getState();
			if (
				storeInst &&
				storeInst.length > 0 &&
				storeState.ownerId === currentUserId
			) {
				setInstallations(storeInst as Installation[]);
				return;
			}
			setErrorLoadingInstallations(
				err instanceof Error ? err.message : String(err),
			);
			setInstallations([]);
		} finally {
			setLoadingInstallations(false);
		}
	}, [installations.length]);

	const { timeZone, offset } = useTimeZone();

	const addWorkOrder = async (workOrder: WorkOrder) => {
		let fechaHoraISO = workOrder.fechaProgramada as string;
		if (
			typeof workOrder.fechaProgramada === "string" &&
			workOrder.horaProgramada
		) {
			try {
				const dateStr = workOrder.fechaProgramada.includes("T")
					? workOrder.fechaProgramada.split("T")[0]
					: workOrder.fechaProgramada;
				const localDate = new Date(`${dateStr}T${workOrder.horaProgramada}`);
				if (!isNaN(localDate.getTime())) {
					fechaHoraISO = localDate.toISOString();
				}
			} catch (_e) {
				// ignore
			}
		}

		const technicianIds = normalizeTechnicianIds(workOrder);

		if (workOrder.estado === "asignada" && technicianIds.length === 0) {
			throw new Error(t("workOrders.validation.technicianRequiredForAssigned"));
		}

		const workOrderWithTZ = {
			...workOrder,
			tipoOrden: workOrder.tipoOrden || "correctivo",
			origen: workOrder.origen || "manual",
			tecnicoAsignado: technicianIds[0] || undefined,
			tecnicosAsignados: technicianIds,
			tecnicosIds: technicianIds,
			fechaProgramada: fechaHoraISO,
			timezone: timeZone,
			userOffset: offset,
		};

		const saveOffline = () => {
			const offlineId = `offline_${Date.now()}`;
			const offlineOrder = {
				...workOrderWithTZ,
				_id: offlineId,
				estado: "pendiente",
			};
			storeAddWorkOrder(offlineOrder);
			if (filteredOfflineOrders) {
				setFilteredOfflineOrders([offlineOrder, ...filteredOfflineOrders]);
			}
			addToQueue({ type: "CREATE_WORK_ORDER", payload: offlineOrder });
			return {
				message: "Orden guardada localmente. Se enviará al reconectar.",
			};
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			const newOrder = await createWorkOrder(workOrderWithTZ);
			storeAddWorkOrder(newOrder);
			return { message: "Orden de trabajo creada con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const editWorkOrder = async (id: string, updatedData: WorkOrder) => {
		let fechaHoraISO = updatedData.fechaProgramada as string;
		if (
			typeof updatedData.fechaProgramada === "string" &&
			updatedData.horaProgramada
		) {
			try {
				const dateStr = updatedData.fechaProgramada.includes("T")
					? updatedData.fechaProgramada.split("T")[0]
					: updatedData.fechaProgramada;
				const localDate = new Date(`${dateStr}T${updatedData.horaProgramada}`);
				if (!isNaN(localDate.getTime())) {
					fechaHoraISO = localDate.toISOString();
				}
			} catch (_e) {
				// ignore
			}
		}

		const technicianIds = normalizeTechnicianIds(updatedData);

		if (updatedData.estado === "asignada" && technicianIds.length === 0) {
			throw new Error(t("workOrders.validation.technicianRequiredForAssigned"));
		}

		const payload = {
			...updatedData,
			tipoOrden: updatedData.tipoOrden || "correctivo",
			origen: updatedData.origen || "manual",
			tecnicoAsignado: technicianIds[0] || undefined,
			tecnicosAsignados: technicianIds,
			tecnicosIds: technicianIds,
			fechaProgramada: fechaHoraISO,
		};

		const saveOffline = () => {
			storeUpdateWorkOrder(id, payload);
			if (filteredOfflineOrders) {
				setFilteredOfflineOrders(
					filteredOfflineOrders.map((wo) =>
						wo._id === id ? { ...wo, ...payload } : wo,
					),
				);
			}
			addToQueue({ type: "UPDATE_WORK_ORDER", payload: { id, data: payload } });
			return { message: "Cambios guardados localmente." };
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			const updated = await updateWorkOrder(id, payload);
			storeUpdateWorkOrder(id, updated);
			return { message: "Orden de trabajo actualizada con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const removeWorkOrder = async (id: string) => {
		const saveOffline = () => {
			storeRemoveWorkOrder(id);
			if (filteredOfflineOrders) {
				setFilteredOfflineOrders(
					filteredOfflineOrders.filter((wo) => wo._id !== id),
				);
			}
			addToQueue({ type: "DELETE_WORK_ORDER", payload: { id } });
			return { message: "Orden eliminada localmente." };
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			await deleteWorkOrder(id);
			storeRemoveWorkOrder(id);
			return { message: "Orden de trabajo eliminada exitosamente" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const assignTechnician = async (
		workOrderId: string,
		technicianIds: string[],
	) => {
		const saveOffline = () => {
			addToQueue({
				type: "ASSIGN_WORK_ORDER_TECHNICIAN",
				payload: { id: workOrderId, technicianIds },
			});
			return { message: "Asignación guardada localmente." };
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			await assignTechnicianToWorkOrder(workOrderId, technicianIds);
			await loadWorkOrders();
			return { message: "Técnico asignado con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const completeWorkOrder = async (
		id: string,
		data: Record<string, unknown>,
	) => {
		const saveOffline = () => {
			const completedAt = new Date();
			const completedAtIso = completedAt.toISOString();
			const offlineCompletionData = {
				...data,
				fechaCompletadaOffline: completedAtIso,
				fechaEjecucionOffline: completedAtIso,
				timezone: timeZone,
				userOffset: offset,
				offlineSync: true,
			};
			const completionUpdate = {
				estado: "completada",
				fechaCompletada: completedAt,
				...offlineCompletionData,
			};
			storeUpdateWorkOrder(id, completionUpdate as Partial<WorkOrder>);
			addToQueue({
				type: "COMPLETE_WORK_ORDER",
				payload: { id, data: offlineCompletionData },
			});
			return {
				message: "Orden completada localmente. Se sincronizará al reconectar.",
			};
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			const result = await apiCompleteWorkOrder(id, data);
			storeUpdateWorkOrder(id, {
				estado: "completada",
				fechaCompletada: new Date(),
				...data,
				...result,
			});
			return { message: "Orden de trabajo completada con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const startWorkOrder = async (id: string) => {
		const saveOffline = () => {
			const startedAt = new Date();
			const startedAtIso = startedAt.toISOString();
			const startData = {
				fechaInicioOffline: startedAtIso,
				fechaEjecucionOffline: startedAtIso,
				timezone: timeZone,
				userOffset: offset,
				offlineSync: true,
			};
			storeUpdateWorkOrder(id, {
				estado: "en_progreso",
				fechaInicio: startedAt,
				...startData,
			});
			addToQueue({
				type: "START_WORK_ORDER",
				payload: { id, data: startData },
			});
			return { message: "Orden iniciada localmente." };
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			await apiStartWorkOrder(id);
			storeUpdateWorkOrder(id, {
				estado: "en_progreso",
				fechaInicio: new Date(),
			});
			return { message: "Orden de trabajo iniciada con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const changeWorkOrderStatus = async (
		id: string,
		estado: string,
		observaciones?: string,
	) => {
		const saveOffline = () => {
			const update = { estado, observaciones };
			storeUpdateWorkOrder(id, update as Partial<WorkOrder>);
			if (filteredOfflineOrders) {
				setFilteredOfflineOrders(
					filteredOfflineOrders.map((wo) =>
						wo._id === id ? { ...wo, ...update } : wo,
					),
				);
			}
			addToQueue({
				type: "UPDATE_WORK_ORDER_STATUS",
				payload: { id, estado, observaciones },
			});
			return { message: "Cambio de estado guardado localmente." };
		};

		if (!navigator.onLine) {
			return saveOffline();
		}

		try {
			const updated = await apiUpdateWorkOrderStatus(id, estado, observaciones);
			storeUpdateWorkOrder(id, updated);
			return { message: "Estado de la orden actualizado con éxito" };
		} catch (err: unknown) {
			if (isOfflineError(err)) {
				return saveOffline();
			}
			throw err;
		}
	};

	const handleFieldChange = useCallback(
		(name: string, value: unknown) => {
			setFormData((prevFormData) => ({ ...prevFormData, [name]: value }));

			if (formErrors[name]) {
				setFormErrors((prev) => {
					const newErrors = { ...prev };
					delete newErrors[name];
					return newErrors;
				});
			}
		},
		[formErrors],
	);

	const handleSubmitForm = async (
		e: React.FormEvent,
		isEditMode: boolean,
		initialData: WorkOrder | null,
		onSuccess: (msg: string) => void,
		onError: (msg: string) => void,
		onAdd?: typeof addWorkOrder,
		onEdit?: typeof editWorkOrder,
	) => {
		e.preventDefault();
		setIsSubmitting(true);

		const validation = await validateWorkOrderForm(
			formData as unknown as Record<string, unknown>,
			t,
		);

		if (!validation.isValid) {
			setFormErrors(validation.errors);
			setIsSubmitting(false);
			return;
		}

		try {
			const result =
				isEditMode && initialData?._id && onEdit
					? await onEdit(initialData._id, formData as WorkOrder)
					: onAdd
						? await onAdd(formData as WorkOrder)
						: { message: "Error: función no definida" };

			onSuccess(result.message);
			resetForm();
		} catch (err: unknown) {
			onError((err as Error).message || "Error al guardar la orden de trabajo");
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = useCallback(() => {
		setFormData({
			titulo: "",
			descripcion: "",
			instalacionId: "",
			estado: "pendiente",
			prioridad: "media",
			tipoTrabajo: "mantenimiento",
			tipoOrden: "correctivo",
			origen: "manual",
			fechaProgramada: new Date().toISOString().split("T")[0], // YYYY-MM-DD
			horaProgramada: "09:00",
			observaciones: "",
			tecnicoAsignado: "",
			tecnicosAsignados: [],
			tecnicosIds: [],
		});
		setFormErrors({});
	}, []);

	const extractInstalacionId = useCallback((data: unknown): string => {
		if (typeof data === "string") return data;
		if (data && typeof data === "object" && (data as { $oid?: string }).$oid)
			return (data as { $oid: string }).$oid;
		return data?.toString() || "";
	}, []);

	const setFormValues = useCallback(
		(data: Partial<WorkOrder>, availableInstallations: Installation[] = []) => {
			let instalacionId = "";
			let instalacionObject = data.instalacion;

			if (data.instalacionId) {
				instalacionId = extractInstalacionId(data.instalacionId);
			} else if (data.instalacion?._id) {
				instalacionId = extractInstalacionId(data.instalacion._id);
			}

			if (availableInstallations.length > 0) {
				if (instalacionId) {
					const foundInstallation = availableInstallations.find(
						(inst) => inst._id === instalacionId,
					);
					if (!foundInstallation && data.instalacion?.company) {
						const foundByName = availableInstallations.find(
							(inst) => inst.company === data.instalacion?.company,
						);
						if (foundByName) {
							instalacionId = foundByName._id;
							instalacionObject = foundByName;
						}
					} else if (foundInstallation) {
						instalacionObject = foundInstallation;
					}
				}
			}

			let fechaProgramada = "";
			if (typeof data.fechaProgramada === "string") {
				fechaProgramada =
					data.fechaProgramada.length > 10
						? data.fechaProgramada.split("T")[0]
						: data.fechaProgramada;
			} else if (data.fechaProgramada instanceof Date) {
				fechaProgramada = data.fechaProgramada.toISOString().split("T")[0];
			} else {
				fechaProgramada = new Date().toISOString().split("T")[0];
			}

			setFormData({
				titulo: data.titulo || "",
				descripcion: data.descripcion || "",
				instalacionId: instalacionId,
				estado: data.estado || "pendiente",
				prioridad: data.prioridad || "media",
				tipoTrabajo: data.tipoTrabajo || "mantenimiento",
				tipoOrden: data.tipoOrden || "correctivo",
				origen: data.origen || "manual",
				fechaProgramada,
				horaProgramada: data.horaProgramada || "09:00",
				observaciones: data.observaciones || "",
				tecnicoAsignado: data.tecnicoAsignado || "",
				tecnicosAsignados: normalizeTechnicianIds(data),
				tecnicosIds: normalizeTechnicianIds(data),
				instalacion: instalacionObject || undefined,
			});
			setFormErrors({});
		},
		[extractInstalacionId, normalizeTechnicianIds],
	);

	const workOrders = useMemo(() => {
		let orders = filteredOfflineOrders || validStoredWorkOrders;

		// 1. Filter out items pending deletion
		const pendingDeletes = queue
			.filter((req) => req.type === "DELETE_WORK_ORDER")
			.map((req) => (req.payload as { id: string }).id);

		if (pendingDeletes.length > 0) {
			orders = orders.filter((wo) => wo._id && !pendingDeletes.includes(wo._id));
		}

		// 2. Add items pending creation that might have been overwritten by a stale cache fetch
		const pendingCreates = queue
			.filter((req) => req.type === "CREATE_WORK_ORDER")
			.map((req) => req.payload as unknown as WorkOrder);

		if (pendingCreates.length > 0) {
			const existingIds = new Set(orders.map((wo) => wo._id).filter(Boolean));
			for (const pending of pendingCreates) {
				if (pending._id && !existingIds.has(pending._id)) {
					orders = [pending, ...orders];
				}
			}
		}

		// 3. Apply pending updates
		const pendingUpdates = queue.filter((req) => req.type === "UPDATE_WORK_ORDER");
		if (pendingUpdates.length > 0) {
			orders = orders.map((wo) => {
				const update = pendingUpdates.find(
					(req) => (req.payload as { id: string }).id === wo._id,
				);
				if (update) {
					return { ...wo, ...(update.payload as { data: Partial<WorkOrder> }).data };
				}
				return wo;
			});
		}

		return orders;
	}, [filteredOfflineOrders, validStoredWorkOrders, queue]);

	return {
		workOrders,
		lastUpdated,
		pagination,
		technicians,
		installations,
		loading,
		loadingInstallations,
		error,
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
		formData,
		setFormData,
		formErrors,
		handleFieldChange,
		handleSubmitForm,
		isSubmitting,
		setFormErrors,
		resetForm,
		setFormValues,
	};
};

export default useWorkOrders;
