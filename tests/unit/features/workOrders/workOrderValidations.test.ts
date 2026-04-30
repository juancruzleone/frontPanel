import { describe, it, expect, vi } from 'vitest';
import { validateWorkOrderForm } from '../../../../src/features/workOrders/validators/workOrderValidations';

describe('WorkOrder Validations', () => {
  const t = (key: string) => key;

  const validWorkOrder = {
    titulo: 'Test Work Order',
    descripcion: 'This is a test description with more than 10 characters',
    instalacionId: 'inst_123',
    prioridad: 'media',
    fechaProgramada: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    horaProgramada: '10:00',
    tipoTrabajo: 'mantenimiento',
    tipoOrden: 'correctivo',
    estado: 'pendiente',
    tecnicosIds: []
  };

  it('should be valid for status "pendiente" without technicians', async () => {
    const result = await validateWorkOrderForm(validWorkOrder, t);
    expect(result.isValid).toBe(true);
  });

  it('should be invalid for status "asignada" without technicians', async () => {
    const invalidOrder = { ...validWorkOrder, estado: 'asignada', tecnicosIds: [] };
    const result = await validateWorkOrderForm(invalidOrder, t);
    expect(result.isValid).toBe(false);
    expect(result.errors.estado).toBe('workOrders.validation.technicianRequiredForAssigned');
  });

  it('should be valid for status "asignada" with technicians', async () => {
    const validAssignedOrder = { ...validWorkOrder, estado: 'asignada', tecnicosIds: ['tech_1'] };
    const result = await validateWorkOrderForm(validAssignedOrder, t);
    expect(result.isValid).toBe(true);
  });

  it('should be valid for status "asignada" with tecnicoAsignado', async () => {
    const validAssignedOrder = { ...validWorkOrder, estado: 'asignada', tecnicoAsignado: 'tech_1' };
    const result = await validateWorkOrderForm(validAssignedOrder, t);
    expect(result.isValid).toBe(true);
  });
});
