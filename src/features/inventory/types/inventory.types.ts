export interface InventoryItem {
  _id?: string;
  tenantId: string;
  externalId?: string;
  code?: string;
  name: string;
  category?: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  location?: string;
  supplierSnapshot?: SupplierSnapshot | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  assetId?: string;
  activoId?: string;
  inventorySource?: 'inventory' | 'asset';
}

export interface InventoryAsset {
  _id?: string;
  nombre?: string;
  name?: string;
  categoria?: string;
  category?: string;
  templateId?: string;
  location?: string;
  ubicacion?: string;
  stock?: number;
  currentStock?: number;
  minimumStock?: number;
  stockMinimo?: number;
  unit?: string;
  unidad?: string;
  active?: boolean;
}

export interface SupplierSnapshot {
  supplierId?: string;
  supplierExternalId?: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface InventoryMovement {
  _id?: string;
  tenantId: string;
  inventoryItemId: string;
  type: 'entry' | 'exit' | 'adjustment' | 'consumption';
  quantity: number;
  beforeStock: number;
  afterStock: number;
  referenceType?: 'work_order' | 'manual';
  referenceId?: string;
  reason?: string;
  performedBy: string;
  createdAt: Date;
}

export interface InventoryAdjustmentPayload {
  inventoryItemId: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason: string;
}

export interface WorkOrderPart {
  inventoryItemId: string;
  nameSnapshot: string;
  unit: string;
  quantity: number;
  movementId?: string;
}
