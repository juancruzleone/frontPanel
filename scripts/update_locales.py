import json
import os

locales_dir = '/home/jleone/work/frontGMAO/src/i18n/locales'

translations = {
    'es': {
        'nav_suppliers': 'Proveedores',
        'nav_inventory': 'Inventario',
        'inventory': {
            "title": "Inventario",
            "addItem": "Agregar Item",
            "editItem": "Editar Item",
            "searchPlaceholder": "Buscar por nombre, código o categoría...",
            "noItemsFound": "No se encontraron items de inventario",
            "name": "Nombre",
            "unit": "Unidad",
            "stock": "Stock",
            "minimumStock": "Stock Mínimo",
            "category": "Categoría",
            "location": "Ubicación",
            "history": "Historial de Movimientos",
            "adjustStock": "Ajustar Stock",
            "itemAdded": "Item agregado correctamente",
            "itemUpdated": "Item actualizado correctamente",
            "itemDeleted": "Item eliminado correctamente",
            "deleteItem": "Eliminar Item",
            "deleteConfirmMessage": "¿Estás seguro de que deseas eliminar el item \"{{name}}\"? Esta acción no se puede deshacer.",
            "noMovementsFound": "No hay movimientos registrados para este item",
            "lowStockAlert": "Alerta de Stock Bajo",
            "minimum": "Mínimo",
            "andMore": "y {{count}} más...",
            "inventoryMaterials": "Materiales del Inventario",
            "selectItem": "-- Seleccionar Item --",
            "adjustmentType": "Tipo de Ajuste",
            "entry": "Entrada",
            "exit": "Salida",
            "manualAdjustment": "Ajuste Manual",
            "quantity": "Cantidad",
            "newStock": "Nuevo Stock Total",
            "reason": "Motivo",
            "reasonPlaceholder": "Ej: Compra a proveedor, rotura, etc.",
            "movementTypes": {
                "entry": "Entrada",
                "exit": "Salida",
                "adjustment": "Ajuste",
                "consumption": "Consumo (OT)"
            },
            "validation": {
                "nameRequired": "El nombre es obligatorio",
                "unitRequired": "La unidad es obligatoria",
                "mustBeNumber": "Debe ser un número",
                "minStock": "No puede ser negativo"
            }
        },
        'suppliers': {
            "title": "Proveedores",
            "addSupplier": "Agregar Proveedor",
            "editSupplier": "Editar Proveedor",
            "deleteSupplier": "Eliminar Proveedor",
            "deleteConfirmMessage": "¿Estás seguro de que deseas eliminar al proveedor \"{{name}}\"? Esta acción no se puede deshacer.",
            "searchPlaceholder": "Buscar por nombre o email...",
            "noSuppliersFound": "No se encontraron proveedores",
            "name": "Nombre",
            "contactName": "Contacto",
            "email": "Email",
            "phone": "Teléfono",
            "address": "Dirección",
            "supplierAdded": "Proveedor agregado correctamente",
            "supplierUpdated": "Proveedor actualizado correctamente",
            "supplierDeleted": "Proveedor eliminado correctamente"
        }
    },
    'en': {
        'nav_suppliers': 'Suppliers',
        'nav_inventory': 'Inventory',
        'inventory': {
            "title": "Inventory",
            "addItem": "Add Item",
            "editItem": "Edit Item",
            "searchPlaceholder": "Search by name, code or category...",
            "noItemsFound": "No inventory items found",
            "name": "Name",
            "unit": "Unit",
            "stock": "Stock",
            "minimumStock": "Minimum Stock",
            "category": "Category",
            "location": "Location",
            "history": "Movement History",
            "adjustStock": "Adjust Stock",
            "itemAdded": "Item added successfully",
            "itemUpdated": "Item updated successfully",
            "itemDeleted": "Item deleted successfully",
            "deleteItem": "Delete Item",
            "deleteConfirmMessage": "Are you sure you want to delete item \"{{name}}\"? This action cannot be undone.",
            "noMovementsFound": "No movements recorded for this item",
            "lowStockAlert": "Low Stock Alert",
            "minimum": "Minimum",
            "andMore": "and {{count}} more...",
            "inventoryMaterials": "Inventory Materials",
            "selectItem": "-- Select Item --",
            "adjustmentType": "Adjustment Type",
            "entry": "Entry",
            "exit": "Exit",
            "manualAdjustment": "Manual Adjustment",
            "quantity": "Quantity",
            "newStock": "New Total Stock",
            "reason": "Reason",
            "reasonPlaceholder": "Ex: Purchase from supplier, breakage, etc.",
            "movementTypes": {
                "entry": "Entry",
                "exit": "Exit",
                "adjustment": "Adjustment",
                "consumption": "Consumption (WO)"
            },
            "validation": {
                "nameRequired": "Name is required",
                "unitRequired": "Unit is required",
                "mustBeNumber": "Must be a number",
                "minStock": "Cannot be negative"
            }
        },
        'suppliers': {
            "title": "Suppliers",
            "addSupplier": "Add Supplier",
            "editSupplier": "Edit Supplier",
            "deleteSupplier": "Delete Supplier",
            "deleteConfirmMessage": "Are you sure you want to delete supplier \"{{name}}\"? This action cannot be undone.",
            "searchPlaceholder": "Search by name or email...",
            "noSuppliersFound": "No suppliers found",
            "name": "Name",
            "contactName": "Contact",
            "email": "Email",
            "phone": "Phone",
            "address": "Address",
            "supplierAdded": "Supplier added successfully",
            "supplierUpdated": "Supplier updated successfully",
            "supplierDeleted": "Supplier deleted successfully"
        }
    }
}

# Defaults for other languages (using English)
default_suppliers = translations['en']['suppliers']
default_inventory = translations['en']['inventory']

nav_translations = {
    'de': {'suppliers': 'Lieferanten', 'inventory': 'Lagerbestand'},
    'fr': {'suppliers': 'Fournisseurs', 'inventory': 'Inventaire'},
    'it': {'suppliers': 'Fornitori', 'inventory': 'Inventario'},
    'pt': {'suppliers': 'Fornecedores', 'inventory': 'Inventário'},
    'ja': {'suppliers': '仕入れ先', 'inventory': '在庫'},
    'zh': {'suppliers': '供应商', 'inventory': '库存'},
    'ar': {'suppliers': 'الموردين', 'inventory': 'مخزون'},
    'ko': {'suppliers': '공급업체', 'inventory': '재고'}
}

for filename in os.listdir(locales_dir):
    if not filename.endswith('.json'):
        continue
    
    lang = filename.split('.')[0]
    filepath = os.path.join(locales_dir, filename)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update Nav
    if 'nav' not in data:
        data['nav'] = {}
    
    nav_supp = nav_translations.get(lang, {}).get('suppliers', translations.get(lang, {}).get('nav_suppliers', translations['en']['nav_suppliers']))
    nav_inv = nav_translations.get(lang, {}).get('inventory', translations.get(lang, {}).get('nav_inventory', translations['en']['nav_inventory']))
    
    data['nav']['suppliers'] = nav_supp
    data['nav']['inventory'] = nav_inv
    
    # Update Inventory and Suppliers blocks
    if lang in translations:
        data['inventory'] = translations[lang]['inventory']
        data['suppliers'] = translations[lang]['suppliers']
    else:
        # For other languages, we use English as base if they don't have them
        if 'inventory' not in data:
            data['inventory'] = default_inventory
        if 'suppliers' not in data:
            data['suppliers'] = default_suppliers

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {filename}")
