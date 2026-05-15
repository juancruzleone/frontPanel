import {
	getAuthHeaders,
	getHeadersWithContentType,
} from "../../../shared/utils/apiHeaders";

const API_URL = import.meta.env.VITE_API_URL || "/api/";

export type Technician = {
	_id: string;
	userName: string;
	email?: string;
	role: string;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyErrorValue = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (!isRecord(value)) return "";

	const candidateKeys = [
		"message",
		"msg",
		"error",
		"text",
		"title",
		"detail",
		"code",
		"path",
	];
	const candidates = candidateKeys
		.map((key) => stringifyErrorValue(value[key]))
		.filter(Boolean);

	if (candidates.length > 0) return candidates.join(" - ");

	try {
		return JSON.stringify(value);
	} catch {
		return "Error inesperado";
	}
};

const buildErrorMessage = (error: unknown, response: Response): string => {
	if (!isRecord(error))
		return `Error ${response.status}: ${response.statusText}`;

	const messageParts = [error.message, error.error, error.code]
		.map(stringifyErrorValue)
		.filter(Boolean);

	const details = Array.isArray(error.details)
		? error.details.map(stringifyErrorValue).filter(Boolean)
		: stringifyErrorValue(error.details);

	const detailParts = Array.isArray(details)
		? details
		: details
			? [details]
			: [];
	const fullMessage = [...messageParts, ...detailParts].join(": ");

	return fullMessage || `Error ${response.status}: ${response.statusText}`;
};

const handleResponse = async (response: Response) => {
	if (!response.ok) {
		let error: unknown;
		try {
			error = await response.json();
		} catch {
			error = { message: "Error de conexión", details: await response.text() };
		}

		throw new Error(buildErrorMessage(error, response));
	}

	return await response.json();
};

const normalizeTechnicianIds = (workOrder: Partial<WorkOrder>) => {
	const ids = [
		...(Array.isArray(workOrder.tecnicosAsignados)
			? workOrder.tecnicosAsignados
			: []),
		...(Array.isArray(workOrder.tecnicosIds) ? workOrder.tecnicosIds : []),
		workOrder.tecnicoAsignado,
	];

	return Array.from(new Set(ids.filter(Boolean).map((id) => String(id))));
};

export type PaginatedResponse<T> = {
	data: T[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
};

export const fetchWorkOrders = async (
	page = 1,
	limit = 10,
	filters: Record<string, string | number> = {},
): Promise<PaginatedResponse<WorkOrder>> => {
	const queryParams = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
		...(filters as Record<string, string>),
	});

	const ordersResponse = await fetch(
		`${API_URL}ordenes-trabajo?${queryParams}`,
		{
			headers: getAuthHeaders(),
		},
	);

	const ordersData = await handleResponse(ordersResponse);

	return {
		data: ordersData.data || [],
		pagination: ordersData.pagination || {
			total: (ordersData.data || []).length,
			page: 1,
			limit: 10,
			totalPages: 1,
		},
	};
};

export const fetchInstallations = async (): Promise<Installation[]> => {
	const response = await fetch(`${API_URL}installations`, {
		headers: getAuthHeaders(),
	});

	const result = await handleResponse(response);
	return Array.isArray(result) ? result : result.data || [];
};

export const createWorkOrder = async (workOrder: WorkOrder) => {
	const technicianIds = normalizeTechnicianIds(workOrder);
	const payload = {
		...workOrder,
		tipoOrden: workOrder.tipoOrden || "correctivo",
		origen: workOrder.origen || "manual",
		tecnicoAsignado: technicianIds[0] || undefined,
		tecnicosAsignados: technicianIds,
		tecnicosIds: technicianIds,
	};
	const response = await fetch(`${API_URL}ordenes-trabajo`, {
		method: "POST",
		headers: getHeadersWithContentType(),
		body: JSON.stringify(payload),
	});

	const result = await handleResponse(response);
	return result.data || result;
};

export const updateWorkOrder = async (id: string, workOrder: WorkOrder) => {
	const { _id: _, ...rest } = workOrder;
	const technicianIds = normalizeTechnicianIds(rest);
	const payload = {
		...rest,
		tipoOrden: rest.tipoOrden || "correctivo",
		origen: rest.origen || "manual",
		tecnicoAsignado: technicianIds[0] || undefined,
		tecnicosAsignados: technicianIds,
		tecnicosIds: technicianIds,
	};

	const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
		method: "PUT",
		headers: getHeadersWithContentType(),
		body: JSON.stringify(payload),
	});

	const result = await handleResponse(response);
	return result.data || result;
};

export const updateWorkOrderStatus = async (
	id: string,
	estado: string,
	observaciones?: string,
) => {
	const response = await fetch(`${API_URL}ordenes-trabajo/${id}/estado`, {
		method: "PATCH",
		headers: getHeadersWithContentType(),
		body: JSON.stringify({ estado, observaciones }),
	});

	const result = await handleResponse(response);
	return result.data || result;
};

export const deleteWorkOrder = async (id: string) => {
	const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
		method: "DELETE",
		headers: getAuthHeaders(),
	});

	return handleResponse(response);
};

export const assignTechnicianToWorkOrder = async (
	workOrderId: string,
	technicianIds: string[],
) => {
	const normalizedIds = Array.from(
		new Set(technicianIds.filter(Boolean).map((id) => String(id))),
	);
	const url = `${API_URL}ordenes-trabajo/${workOrderId}/asignar`;
	const body = JSON.stringify({
		tecnicoId: normalizedIds[0] || undefined,
		tecnicoIds: normalizedIds,
	});
	const response = await fetch(url, {
		method: "PATCH",
		headers: getHeadersWithContentType(),
		body: body,
	});

	return handleResponse(response);
};

export type WorkOrderCompletionData = Record<string, unknown> & {
	fechaCompletadaOffline?: string;
	fechaEjecucionOffline?: string;
	timezone?: string;
	userOffset?: number;
	offlineSync?: boolean;
};

export type WorkOrderStartData = {
	fechaInicioOffline?: string;
	fechaEjecucionOffline?: string;
	timezone?: string;
	userOffset?: number;
	offlineSync?: boolean;
};

export const completeWorkOrder = async (
	workOrderId: string,
	completionData: WorkOrderCompletionData,
) => {
	const response = await fetch(
		`${API_URL}ordenes-trabajo/${workOrderId}/completar`,
		{
			method: "POST",
			headers: getHeadersWithContentType(),
			body: JSON.stringify(completionData),
		},
	);

	const result = await handleResponse(response);
	return result.data || result;
};

export const startWorkOrder = async (
	workOrderId: string,
	startData?: WorkOrderStartData,
) => {
	const response = await fetch(
		`${API_URL}ordenes-trabajo/${workOrderId}/iniciar`,
		{
			method: "PATCH",
			headers: startData ? getHeadersWithContentType() : getAuthHeaders(),
			...(startData ? { body: JSON.stringify(startData) } : {}),
		},
	);

	const result = await handleResponse(response);
	return result.data || result;
};

export const getWorkOrderById = async (id: string): Promise<WorkOrder> => {
	const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
		headers: getAuthHeaders(),
	});

	const result = await handleResponse(response);
	return result.data || result;
};
