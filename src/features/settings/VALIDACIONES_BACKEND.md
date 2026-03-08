# Validaciones Dinámicas desde el Backend

## Resumen

Se ha implementado un sistema de validaciones dinámicas que delega toda la lógica de negocio al backend. El frontend solo realiza validaciones básicas para feedback inmediato y luego consulta al backend para validaciones completas.

## Arquitectura

### Frontend
- **Servicio**: `src/features/settings/services/validationService.ts`
- **Hook**: `src/features/settings/hooks/useBackendValidations.ts` (opcional, para casos más complejos)
- **Componentes actualizados**:
  - `ModalManageInstallationTypes.tsx`
  - `ModalManageDeviceCategories.tsx`
  - `ModalManageFormCategories.tsx`

### Flujo de Validación

1. **Validación local inmediata**: Solo verifica que el campo no esté vacío
2. **Validación con backend**: Antes de crear/actualizar, consulta al backend
3. **Manejo de errores**: Muestra errores específicos del backend

## Endpoints Requeridos en el Backend

### 1. Validar Tipo de Instalación

```
POST /api/installation-types/validate
```

**Request Body:**
```json
{
  "nombre": "Tipo de instalación",
  "excludeId": "optional-id-for-edit"
}
```

**Response (válido):**
```json
{
  "valid": true
}
```

**Response (inválido - 400):**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "nombre",
      "message": "El nombre debe tener al menos 2 caracteres"
    }
  ]
}
```

O simplemente:
```json
{
  "message": "El nombre ya existe"
}
```

### 2. Validar Categoría de Dispositivo

```
POST /api/device-categories/validate
```

**Request Body:**
```json
{
  "nombre": "Categoría",
  "excludeId": "optional-id-for-edit"
}
```

**Response**: Igual que el anterior

### 3. Validar Categoría de Formulario

```
POST /api/form-categories/validate
```

**Request Body:**
```json
{
  "nombre": "Categoría",
  "excludeId": "optional-id-for-edit"
}
```

**Response**: Igual que el anterior

### 4. Obtener Reglas de Validación (Opcional)

```
GET /api/validations/{entity}/rules
```

Donde `{entity}` puede ser: `installation-types`, `device-categories`, `form-categories`

**Response:**
```json
{
  "rules": [
    {
      "field": "nombre",
      "type": "required",
      "message": "El nombre es requerido"
    },
    {
      "field": "nombre",
      "type": "minLength",
      "value": 2,
      "message": "El nombre debe tener al menos 2 caracteres"
    },
    {
      "field": "nombre",
      "type": "maxLength",
      "value": 50,
      "message": "El nombre no puede exceder 50 caracteres"
    },
    {
      "field": "nombre",
      "type": "unique",
      "message": "El nombre ya existe"
    }
  ]
}
```

## Reglas de Validación Sugeridas para el Backend

### Nombre (campo común)

1. **Requerido**: No puede estar vacío
2. **Longitud mínima**: 2 caracteres
3. **Longitud máxima**: 50 caracteres
4. **Único**: No puede existir otro registro con el mismo nombre (case-insensitive)
5. **Caracteres permitidos**: Letras, números, espacios, guiones y guiones bajos
6. **Sin espacios múltiples**: No permitir espacios consecutivos
7. **Trim**: Eliminar espacios al inicio y final

### Ejemplo de Validación en Backend (Node.js/Express)

```javascript
// Middleware de validación
const validateInstallationType = async (req, res, next) => {
  const { nombre, excludeId } = req.body;
  const errors = [];

  // Requerido
  if (!nombre || !nombre.trim()) {
    errors.push({
      field: 'nombre',
      message: 'El nombre es requerido'
    });
  }

  // Longitud mínima
  if (nombre && nombre.trim().length < 2) {
    errors.push({
      field: 'nombre',
      message: 'El nombre debe tener al menos 2 caracteres'
    });
  }

  // Longitud máxima
  if (nombre && nombre.trim().length > 50) {
    errors.push({
      field: 'nombre',
      message: 'El nombre no puede exceder 50 caracteres'
    });
  }

  // Caracteres permitidos
  const validPattern = /^[a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]+$/;
  if (nombre && !validPattern.test(nombre.trim())) {
    errors.push({
      field: 'nombre',
      message: 'El nombre contiene caracteres no permitidos'
    });
  }

  // Espacios múltiples
  if (nombre && /\s{2,}/.test(nombre)) {
    errors.push({
      field: 'nombre',
      message: 'No se permiten espacios múltiples'
    });
  }

  // Único
  if (nombre) {
    const query = {
      nombre: { $regex: new RegExp(`^${nombre.trim()}$`, 'i') }
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await InstallationType.findOne(query);
    if (exists) {
      errors.push({
        field: 'nombre',
        message: 'Ya existe un tipo de instalación con este nombre'
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ valid: false, errors });
  }

  next();
};

// Ruta
router.post('/api/installation-types/validate', validateInstallationType, (req, res) => {
  res.json({ valid: true });
});
```

## Ventajas de este Enfoque

1. **Lógica centralizada**: Todas las reglas de negocio están en el backend
2. **Consistencia**: Las mismas validaciones se aplican en todas las operaciones
3. **Mantenibilidad**: Cambiar reglas solo requiere modificar el backend
4. **Seguridad**: El frontend no puede saltarse validaciones
5. **Feedback inmediato**: Validación local básica para UX
6. **Validación completa**: Backend valida todo antes de persistir

## Traducciones Necesarias

Agregar al archivo de traducciones:

```json
{
  "settings": {
    "error": {
      "validationFailed": "Error al validar los datos"
    }
  }
}
```

## Próximos Pasos

1. Implementar los endpoints de validación en el backend
2. Configurar las reglas de validación según las necesidades del negocio
3. Probar las validaciones con diferentes casos
4. Ajustar mensajes de error según feedback de usuarios
