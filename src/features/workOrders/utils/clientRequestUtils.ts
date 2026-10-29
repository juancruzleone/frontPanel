/**
 * Helpers para solicitudes de mantenimiento de clientes.
 * La solicitud ya es una orden de trabajo con origen "solicitud_cliente":
 * estas funciones solo separan vistas y permisos por rol sin duplicar entidades.
 */

export const CLIENT_REQUEST_ORIGIN = "solicitud_cliente";

export const REVIEWABLE_REQUEST_STATES = ["solicitada", "en_revision", "pendiente"] as const;

export const CANCELLABLE_CLIENT_STATES = [
  "solicitada",
  "en_revision",
  "pendiente",
  "asignada",
] as const;

export interface ClientRequestLike {
  origen?: string | null;
  estado?: string | null;
  creadoPor?: string | null;
  solicitadoPor?: string | null;
  fechaPreferida?: string | Date | null;
  horaPreferida?: string | null;
  fechaProgramada?: string | Date | null;
  horaProgramada?: string | null;
}

export const isClientRequest = <T extends Pick<ClientRequestLike, "origen">>(order: T): boolean =>
  order?.origen === CLIENT_REQUEST_ORIGIN;

const matchesOwner = (
  order: Pick<ClientRequestLike, "creadoPor" | "solicitadoPor">,
  userId?: string | null,
): boolean => {
  if (!userId) return true;
  const owner = order?.solicitadoPor ?? order?.creadoPor;
  // S3: sin dato de autoría no se puede atribuir a nadie; excluir en vez de
  // mostrarla como propia. El backend debe filtrar por autor (contrato pendiente).
  if (!owner) return false;
  return String(owner) === String(userId);
};

/** Solicitudes creadas por el cliente autenticado (vista "Mis solicitudes"). */
export const filterMyRequests = <T extends ClientRequestLike>(
  orders: T[],
  userId?: string | null,
): T[] =>
  (orders ?? []).filter((order) => isClientRequest(order) && matchesOwner(order, userId));

/** Solicitudes pendientes de revisión (vista admin "Solicitudes recibidas"). */
export const filterReceivedRequests = <T extends ClientRequestLike>(orders: T[]): T[] =>
  (orders ?? []).filter(
    (order) => isClientRequest(order) && REVIEWABLE_REQUEST_STATES.includes(order.estado as (typeof REVIEWABLE_REQUEST_STATES)[number]),
  );

/** El admin puede revisar (aceptar/rechazar/programar) estas solicitudes. */
export const canReviewRequest = (
  order: Pick<ClientRequestLike, "origen" | "estado">,
  role?: string | null,
): boolean => {
  if (role !== "admin") return false;
  if (!isClientRequest(order)) return false;
  return REVIEWABLE_REQUEST_STATES.includes(order.estado as (typeof REVIEWABLE_REQUEST_STATES)[number]);
};

/** El cliente puede pedir cancelación mientras la orden no esté en ejecución. */
export const canRequestCancel = (
  order: Pick<ClientRequestLike, "origen" | "estado" | "creadoPor" | "solicitadoPor">,
  role?: string | null,
  userId?: string | null,
): boolean => {
  if (role !== "cliente") return false;
  if (!isClientRequest(order)) return false;
  if (!CANCELLABLE_CLIENT_STATES.includes(order.estado as (typeof CANCELLABLE_CLIENT_STATES)[number])) return false;
  return matchesOwner(order, userId);
};

export type RequestStatusGroup = "pendientes" | "en_proceso" | "resueltas";

/** Agrupa estados para las tarjetas resumen de "Mis solicitudes". */
export const getRequestStatusGroup = (estado?: string | null): RequestStatusGroup => {
  switch (estado) {
    case "solicitada":
    case "en_revision":
    case "pendiente":
      return "pendientes";
    case "asignada":
    case "en_progreso":
      return "en_proceso";
    default:
      return "resueltas";
  }
};

export interface PreferredVsScheduled {
  preferred: string | null;
  scheduled: string | null;
  areDifferent: boolean;
}

const toDay = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : null;
  return date.toISOString().split("T")[0];
};

/**
 * Separa la preferencia del cliente (fechaPreferida) de la fecha confirmada
 * por el administrador (fechaProgramada). Si no hay preferencia, se usa la
 * programada como referencia para no romper la vista.
 */
export const getPreferredVsScheduled = (order: ClientRequestLike): PreferredVsScheduled => {
  const preferred = toDay(order.fechaPreferida) ?? null;
  const scheduled = toDay(order.fechaProgramada) ?? null;
  return {
    preferred,
    scheduled,
    areDifferent: Boolean(preferred && scheduled && preferred !== scheduled),
  };
};
