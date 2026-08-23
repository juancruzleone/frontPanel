import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useWorkOrders from '../../../../src/features/workOrders/hooks/useWorkOrders';
import * as workOrderServices from '../../../../src/features/workOrders/services/workOrderServices';
import { useWorkOrderStore } from '../../../../src/store/workOrderStore';

const offlineState = vi.hoisted(() => ({
  addToQueue: vi.fn(),
  queue: [] as Array<{ id: string; userId?: string; type: string; payload: Record<string, unknown>; timestamp: number }>,
}));
const completionLifecycle = vi.hoisted(() => ({
  complete: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('../../../../src/features/workOrders/services/workOrderServices');
vi.mock('../../../../src/features/workOrders/services/technicianServices');
vi.mock('../../../../src/shared/offline/lifecycleStart', () => ({
  buildStartCommandId: (id: string) => `start-${id}`,
  resolveStartContext: completionLifecycle.resolve,
  completeWorkOrderOnlineOrOffline: completionLifecycle.complete,
  startWorkOrderOnlineOrOffline: vi.fn(),
}));
vi.mock('../../../../src/store/authStore', () => {
  const mockState = { userId: 'test-user', isAuthenticated: true };
  const mockHook = vi.fn((selector) => selector ? selector(mockState) : mockState);
  (mockHook as any).getState = () => mockState;
  return { useAuthStore: mockHook };
});
vi.mock('../../../../src/store/offlineStore', () => {
  const mockStore = vi.fn((selector) => selector ? selector(offlineState) : offlineState) as any;
  mockStore.getState = vi.fn(() => offlineState);
  mockStore.addToQueue = offlineState.addToQueue;
  return { useOfflineStore: mockStore };
});
vi.mock('../../../src/features/calendar/hooks/useTimeZone', () => ({
  useTimeZone: () => ({ timeZone: 'UTC', offset: 0 })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('useWorkOrders hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    offlineState.queue = [];
    completionLifecycle.resolve.mockResolvedValue({ ctx: { packageId: 'pkg-1' } });
    completionLifecycle.complete.mockResolvedValue({ status: 'pending_offline', messageKey: 'offline.pendingSync' });
    useWorkOrderStore.setState({ workOrders: [], lastUpdated: null, ownerId: null });
  });

  it('should throw error when editing to status "asignada" without technicians', async () => {
    const { result } = renderHook(() => useWorkOrders());
    
    const workOrder = {
      _id: '123',
      titulo: 'Test',
      descripcion: 'Test description',
      instalacionId: 'inst1',
      estado: 'asignada',
      fechaProgramada: '2026-05-01',
      horaProgramada: '10:00',
      prioridad: 'media',
      tipoTrabajo: 'mantenimiento',
      tecnicosAsignados: []
    } as any;

    await expect(result.current.editWorkOrder('123', workOrder))
      .rejects.toThrow('workOrders.validation.technicianRequiredForAssigned');
  });

  it('should throw error when adding order with status "asignada" without technicians', async () => {
    const { result } = renderHook(() => useWorkOrders());
    
    const workOrder = {
      titulo: 'Test',
      descripcion: 'Test description',
      instalacionId: 'inst1',
      estado: 'asignada',
      fechaProgramada: '2026-05-01',
      horaProgramada: '10:00',
      prioridad: 'media',
      tipoTrabajo: 'mantenimiento',
      tecnicosAsignados: []
    } as any;

    await expect(result.current.addWorkOrder(workOrder))
      .rejects.toThrow('workOrders.validation.technicianRequiredForAssigned');
  });

  it('should call updateWorkOrder when valid technicians are present for "asignada"', async () => {
    const { result } = renderHook(() => useWorkOrders());
    
    const workOrder = {
      _id: '123',
      titulo: 'Test',
      descripcion: 'Test description',
      instalacionId: 'inst1',
      estado: 'asignada',
      fechaProgramada: '2026-05-01',
      horaProgramada: '10:00',
      prioridad: 'media',
      tipoTrabajo: 'mantenimiento',
      tecnicosAsignados: ['tech1']
    } as any;

    vi.mocked(workOrderServices.updateWorkOrder).mockResolvedValue({ ...workOrder });

    await result.current.editWorkOrder('123', workOrder);
    
    expect(workOrderServices.updateWorkOrder).toHaveBeenCalled();
  });

  it('keeps loadWorkOrders stable after storing fetched orders', async () => {
    vi.mocked(workOrderServices.fetchWorkOrders).mockResolvedValue({
      data: [
        {
          _id: 'wo-1',
          titulo: 'Orden 1',
          descripcion: 'Descripción',
          instalacionId: 'inst1',
          estado: 'pendiente',
          prioridad: 'media',
          tipoTrabajo: 'mantenimiento',
          fechaProgramada: '2026-05-01',
          horaProgramada: '10:00',
        } as any,
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const { result } = renderHook(() => useWorkOrders());
    const initialLoadWorkOrders = result.current.loadWorkOrders;

    await act(async () => {
      await result.current.loadWorkOrders(1, 10, {});
    });

    expect(result.current.loadWorkOrders).toBe(initialLoadWorkOrders);
  });

  describe('offline support', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', { onLine: false });
    });

    it('should queue removeWorkOrder when offline and update store', async () => {
      const { result } = renderHook(() => useWorkOrders());
      const { useOfflineStore } = await import('../../../../src/store/offlineStore');
      
      // GIVEN a work order in the store
      const mockWO = { _id: 'wo-123', titulo: 'Test WO' } as any;
      useWorkOrderStore.setState({ workOrders: [mockWO] });

      // WHEN removing it offline
      await result.current.removeWorkOrder('wo-123');
      
      // THEN it should be queued
      expect(useOfflineStore.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'DELETE_WORK_ORDER',
        payload: { id: 'wo-123' }
      }));

      // AND removed from the store optimistically
      expect(useWorkOrderStore.getState().workOrders).toHaveLength(0);
    });

    it('should queue assignTechnician when offline', async () => {
      const { result } = renderHook(() => useWorkOrders());
      const { useOfflineStore } = await import('../../../../src/store/offlineStore');
      
      await result.current.assignTechnician('wo-123', ['tech-1']);
      
      expect(useOfflineStore.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ASSIGN_WORK_ORDER_TECHNICIAN',
        payload: { id: 'wo-123', technicianIds: ['tech-1'] }
      }));
    });

    it('should queue changeWorkOrderStatus when offline', async () => {
      const { result } = renderHook(() => useWorkOrders());
      const { useOfflineStore } = await import('../../../../src/store/offlineStore');
      
      await result.current.changeWorkOrderStatus('wo-123', 'completada', 'Todo ok');
      
      expect(useOfflineStore.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'UPDATE_WORK_ORDER_STATUS',
        payload: { id: 'wo-123', estado: 'completada', observaciones: 'Todo ok' }
      }));
    });

    it('does not project queued creations owned by another account', () => {
      offlineState.queue = [
        {
          id: 'foreign-command',
          userId: 'other-user',
          type: 'CREATE_WORK_ORDER',
          payload: {
            _id: 'offline-foreign',
            titulo: 'Foreign order',
            descripcion: 'Must remain isolated',
            instalacionId: 'inst-foreign',
            estado: 'pendiente',
            prioridad: 'media',
            tipoTrabajo: 'mantenimiento',
            fechaProgramada: '2026-05-01',
            horaProgramada: '10:00',
          },
          timestamp: 1,
        },
      ];
      useWorkOrderStore.setState({ workOrders: [], ownerId: 'test-user' });

      const { result } = renderHook(() => useWorkOrders());

      expect(result.current.workOrders).toEqual([]);
    });

    it('preserves signature, photo, and completion fields for encrypted offline lifecycle handling', async () => {
      const { result } = renderHook(() => useWorkOrders());
      const completionData = {
        trabajoRealizado: 'Replaced filter',
        observaciones: 'Verified',
        inventoryPartsUsed: [],
        materialesUtilizados: [{ nombre: 'Filtro', cantidad: 1, unidad: 'u' }],
        tiempoTrabajo: 2,
        estadoDispositivo: 'Activo',
        evidenciaFoto: 'data:image/jpeg;base64,cGhvdG8=',
        nombreFoto: 'proof.jpg',
        firmaTecnico: 'data:image/png;base64,c2lnbmF0dXJl',
      };

      await result.current.completeWorkOrder('wo-1', completionData);

      expect(completionLifecycle.complete).toHaveBeenCalledWith(
        'wo-1',
        expect.objectContaining(completionData),
        expect.anything(),
        'start-wo-1',
        expect.any(Function),
        true,
      );
    });
  });
});
