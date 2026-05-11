import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useWorkOrders from '../../../../src/features/workOrders/hooks/useWorkOrders';
import * as workOrderServices from '../../../../src/features/workOrders/services/workOrderServices';
import { useWorkOrderStore } from '../../../../src/store/workOrderStore';

vi.mock('../../../../src/features/workOrders/services/workOrderServices');
vi.mock('../../../../src/features/workOrders/services/technicianServices');
vi.mock('../../../src/features/calendar/hooks/useTimeZone', () => ({
  useTimeZone: () => ({ timeZone: 'UTC', offset: 0 })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('useWorkOrders hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
