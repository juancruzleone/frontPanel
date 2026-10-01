import {
	fetchWithAuthRetry,
	fetchWithCsrf,
	getAuthHeaders,
} from "../../../shared/utils/apiHeaders";
import { downloadResponse } from "../../../shared/utils/downloadResponse";
import { ApiError, throwApiError } from "../../../shared/services/ApiError";

const getApiUrl = () => import.meta.env.VITE_API_URL || "/api/";

const INVALID_START_STATE_CODES = new Set([
	"INVALID_TRANSITION",
	"INVALID_WORK_ORDER_TRANSITION",
	"WORK_ORDER_TERMINAL",
]);

export const resolveStartWorkOrderErrorKey = (error: unknown): string => {
	const code = error instanceof ApiError
		? error.code
		: typeof error === "object" && error !== null && "code" in error
			? String(error.code)
			: undefined;

	if (code && INVALID_START_STATE_CODES.has(code)) return "workOrders.startErrors.invalidState";
	if (code === "WORK_ORDER_FORBIDDEN") return "workOrders.startErrors.forbidden";
	if (code === "WORK_ORDER_NOT_FOUND" || code === "INVALID_WORK_ORDER_ID") return "workOrders.startErrors.notFound";
	if (code === "CSRF_REFRESH_FAILED" || code === "CSRF_TOKEN_INVALID" || code === "CSRF_TOKEN_MISSING") {
		return "workOrders.startErrors.session";
	}

	if (error instanceof ApiError) {
		if (error.status === 401) return "workOrders.startErrors.session";
		if (error.status === 403) return "workOrders.startErrors.forbidden";
		if (error.status === 404) return "workOrders.startErrors.notFound";
		if (error.status === 409) return "workOrders.startErrors.invalidState";
	}

	return "workOrders.errorStartingWorkOrder";
};

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
		`${getApiUrl()}ordenes-trabajo?${queryParams}`,
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

export const exportWorkOrders = async (filters: Record<string, string | number> = {}): Promise<void> => {
  const cleanFilters: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== null && value !== undefined) cleanFilters[key] = String(value)
  }
  const query = new URLSearchParams(cleanFilters)
  const response = await fetchWithAuthRetry(`${getApiUrl()}ordenes-trabajo/csv/export?${query}`, { headers: getAuthHeaders() })
  await downloadResponse(response, "Error al exportar órdenes de trabajo", "work-orders.csv")
}

export type FetchInstallationsParams = {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
};

export const fetchInstallations = async (
	params?: FetchInstallationsParams,
	options?: { signal?: AbortSignal },
): Promise<Installation[] | PaginatedResponse<Installation>> => {
	const queryParams = new URLSearchParams();
	if (params?.page !== undefined) queryParams.set("page", String(params.page));
	if (params?.limit !== undefined) queryParams.set("limit", String(params.limit));
	if (params?.search) queryParams.set("search", params.search);
	if (params?.category) queryParams.set("category", params.category);
	if (!params || queryParams.toString() === "") {
		queryParams.set("limit", "100");
	}

	const response = await fetch(`${getApiUrl()}installations?${queryParams.toString()}`, {
		headers: getAuthHeaders(),
		signal: options?.signal,
	});

	const result = await handleResponse(response);
	if (Array.isArray(result)) return result;
	if (result?.data && result?.pagination) return result as PaginatedResponse<Installation>;
	return Array.isArray(result) ? result : result.data || [];
};

export const createWorkOrder = async (workOrder: WorkOrder, idempotencyKey?: string) => {
	const technicianIds = normalizeTechnicianIds(workOrder);
	const payload = {
		...workOrder,
		tipoOrden: workOrder.tipoOrden || "correctivo",
		origen: workOrder.origen || "manual",
		tecnicoAsignado: technicianIds[0] || undefined,
		tecnicosAsignados: technicianIds,
		tecnicosIds: technicianIds,
	};
	const key = idempotencyKey ?? crypto.randomUUID();
	const response = await fetchWithCsrf(`${getApiUrl()}ordenes-trabajo`, {
		method: "POST",
		headers: { "X-Idempotency-Key": key },
		body: JSON.stringify(payload),
	});

	const result = await handleResponse(response);
	return result.data || result;
};

export const updateWorkOrder = async (id: string, workOrder: WorkOrder, idempotencyKey?: string) => {
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

	const key = idempotencyKey ?? crypto.randomUUID();
	const response = await fetchWithCsrf(`${getApiUrl()}ordenes-trabajo/${id}`, {
		method: "PUT",
		headers: { "X-Idempotency-Key": key },
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
	const response = await fetchWithCsrf(`${getApiUrl()}ordenes-trabajo/${id}/estado`, {
		method: "PATCH",
		body: JSON.stringify({ estado, observaciones }),
	});

	const result = await handleResponse(response);
	return result.data || result;
};

export const deleteWorkOrder = async (id: string) => {
	const response = await fetchWithCsrf(`${getApiUrl()}ordenes-trabajo/${id}`, {
		method: "DELETE",
	});

	return handleResponse(response);
};

export const assignTechnicianToWorkOrder = async (
	workOrderId: string,
	technicianIds: string[],
	idempotencyKey?: string,
) => {
	const normalizedIds = Array.from(
		new Set(technicianIds.filter(Boolean).map((id) => String(id))),
	);
	const url = `${getApiUrl()}ordenes-trabajo/${workOrderId}/asignar`;
	const body = JSON.stringify({
		tecnicoId: normalizedIds[0] || undefined,
		tecnicoIds: normalizedIds,
	});
	const key = idempotencyKey ?? crypto.randomUUID();
	const response = await fetchWithCsrf(url, {
		method: "PATCH",
		headers: { "X-Idempotency-Key": key },
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

export type CompletionDocument = { status: "ready" | "pending"; retryable?: boolean; key?: string };
export type WorkOrderCompletionResult = Record<string, unknown> & { document?: CompletionDocument };

export const buildCompletionIdempotencyKey = (workOrderId: string): string =>
	`completion-${workOrderId}`;

export const formatCompletionSuccessMessage = (result: WorkOrderCompletionResult): string =>
	result.document?.status === "pending"
		? "Orden completada. Documento pendiente de reintento."
		: "Orden completada correctamente.";

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
	idempotencyKey = buildCompletionIdempotencyKey(workOrderId),
) => {
	const response = await fetchWithCsrf(
		`${getApiUrl()}ordenes-trabajo/${workOrderId}/completar`,
		{
			method: "POST",
			headers: { "X-Idempotency-Key": idempotencyKey },
			body: JSON.stringify(completionData),
		},
	);

	const result = await handleResponse(response);
	return (result.data || result) as WorkOrderCompletionResult;
};

export const startWorkOrder = async (
	workOrderId: string,
	startData?: WorkOrderStartData,
) => {
	const response = await fetchWithCsrf(
		`${getApiUrl()}ordenes-trabajo/${workOrderId}/iniciar`,
		{
			method: "PATCH",
			...(startData ? { body: JSON.stringify(startData) } : {}),
		},
	);

	if (!response.ok) {
		return throwApiError(response, "Error al iniciar la orden de trabajo");
	}

	const result = await handleResponse(response);
	return result.data || result;
};

export const getWorkOrderById = async (id: string): Promise<WorkOrder> => {
	const response = await fetch(`${getApiUrl()}ordenes-trabajo/${id}`, {
		headers: getAuthHeaders(),
	});

	const result = await handleResponse(response);
	return result.data || result;
};
