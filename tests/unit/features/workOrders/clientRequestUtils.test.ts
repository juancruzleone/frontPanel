import { describe, expect, it } from "vitest";
import {
  canRequestCancel,
  canReviewRequest,
  filterMyRequests,
  filterReceivedRequests,
  getPreferredVsScheduled,
  getRequestStatusGroup,
  isClientRequest,
} from "../../../../src/features/workOrders/utils/clientRequestUtils";

describe("clientRequestUtils", () => {
  it("detecta solicitudes de cliente por origen", () => {
    expect(isClientRequest({ origen: "solicitud_cliente" })).toBe(true);
    expect(isClientRequest({ origen: "manual" })).toBe(false);
    expect(isClientRequest({})).toBe(false);
  });

  it("filtra Mis solicitudes por autor", () => {
    const orders = [
      { _id: "1", origen: "solicitud_cliente", solicitadoPor: "u1", estado: "solicitada" },
      { _id: "2", origen: "solicitud_cliente", solicitadoPor: "otro", estado: "solicitada" },
      { _id: "3", origen: "manual", solicitadoPor: "u1", estado: "pendiente" },
    ];
    expect(filterMyRequests(orders, "u1").map((o) => o._id)).toEqual(["1"]);
  });

  it("excluye solicitudes sin autor identificado (S3)", () => {
    const withoutOwner = [
      { _id: "a", origen: "solicitud_cliente", estado: "solicitada" },
      { _id: "b", origen: "manual", estado: "pendiente" },
    ];
    expect(filterMyRequests(withoutOwner, "u1").map((o) => o._id)).toEqual([]);
  });

  it("filtra Solicitudes recibidas solo con estados revisables", () => {
    const orders = [
      { origen: "solicitud_cliente", estado: "solicitada" },
      { origen: "solicitud_cliente", estado: "en_revision" },
      { origen: "solicitud_cliente", estado: "en_progreso" },
      { origen: "manual", estado: "solicitada" },
    ];
    expect(filterReceivedRequests(orders)).toHaveLength(2);
  });

  it("solo admin revisa y solo cliente cancela fuera de ejecución", () => {
    expect(
      canReviewRequest({ origen: "solicitud_cliente", estado: "solicitada" }, "admin"),
    ).toBe(true);
    expect(
      canReviewRequest({ origen: "solicitud_cliente", estado: "en_progreso" }, "admin"),
    ).toBe(false);
    expect(
      canReviewRequest({ origen: "manual", estado: "solicitada" }, "admin"),
    ).toBe(false);
    expect(
      canReviewRequest({ origen: "solicitud_cliente", estado: "solicitada" }, "cliente"),
    ).toBe(false);

    expect(
      canRequestCancel(
        { origen: "solicitud_cliente", estado: "solicitada", solicitadoPor: "u1" },
        "cliente",
        "u1",
      ),
    ).toBe(true);
    expect(
      canRequestCancel(
        { origen: "solicitud_cliente", estado: "en_progreso", solicitadoPor: "u1" },
        "cliente",
        "u1",
      ),
    ).toBe(false);
    expect(
      canRequestCancel(
        { origen: "solicitud_cliente", estado: "solicitada", solicitadoPor: "otro" },
        "cliente",
        "u1",
      ),
    ).toBe(false);
  });

  it("agrupa estados para el resumen de Mis solicitudes", () => {
    expect(getRequestStatusGroup("solicitada")).toBe("pendientes");
    expect(getRequestStatusGroup("en_revision")).toBe("pendientes");
    expect(getRequestStatusGroup("en_progreso")).toBe("en_proceso");
    expect(getRequestStatusGroup("completada")).toBe("resueltas");
    expect(getRequestStatusGroup("cancelada")).toBe("resueltas");
  });

  it("separa fecha preferida de fecha programada", () => {
    const same = getPreferredVsScheduled({
      fechaPreferida: "2026-10-20",
      fechaProgramada: "2026-10-20T09:00:00.000Z",
    });
    expect(same.preferred).toBe("2026-10-20");
    expect(same.areDifferent).toBe(false);

    const different = getPreferredVsScheduled({
      fechaPreferida: "2026-10-20",
      fechaProgramada: "2026-10-25T09:00:00.000Z",
    });
    expect(different.areDifferent).toBe(true);

    const withoutPreferred = getPreferredVsScheduled({ fechaProgramada: "2026-10-25T09:00:00.000Z" });
    expect(withoutPreferred.preferred).toBeNull();
  });
});
