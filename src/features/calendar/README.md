# Sistema de Zona Horaria del Calendario

## Descripción

El calendario ahora funciona correctamente según la zona horaria del país del usuario, detectando automáticamente la zona horaria del navegador y manejando las fechas de manera apropiada.

## Características

### 🌍 Detección Automática de Zona Horaria
- Detecta automáticamente la zona horaria del usuario usando `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Muestra información clara sobre la zona horaria actual
- Indica si está en horario de verano (DST)

### 📅 Manejo Correcto de Fechas
- Las fechas se crean y comparan en la zona horaria local del usuario
- No hay problemas de conversión UTC que causen fechas incorrectas
- El filtro de fecha específica funciona correctamente

### 🎯 Componentes Principales

#### `useTimeZone` Hook
```typescript
const { timeZoneInfo, getUserTimeZoneName, isDST } = useTimeZone();
```

#### `TimeZoneInfo` Component
Muestra información de la zona horaria con:
- Nombre de la zona horaria (ej: "Madrid (CET/CEST)")
- Offset de la zona horaria (ej: "+01:00")
- Indicador de horario de verano
- Nota explicativa

#### Utilidades de Fecha
- `createLocalDate()`: Crea fechas en la zona horaria local
- `parseDateString()`: Convierte strings de fecha a Date local
- `compareDates()`: Compara fechas sin problemas de zona horaria

## Zonas Horarias Soportadas

El sistema reconoce y muestra nombres legibles para zonas horarias comunes:

- **América**: Nueva York (EST/EDT), Chicago (CST/CDT), Denver (MST/MDT), Los Ángeles (PST/PDT)
- **Europa**: Londres (GMT/BST), París (CET/CEST), Madrid (CET/CEST), Berlín (CET/CEST)
- **Asia**: Tokio (JST), Shanghai (CST)
- **Oceanía**: Sídney (AEST/AEDT)

## Uso

### En el Calendario Principal
```typescript
import TimeZoneInfo from '../features/calendar/components/TimeZoneInfo';

<TimeZoneInfo showDetails={true} />
```

### En el Modal de Fecha
```typescript
import { parseDateString, formatDateToString } from '../utils/dateUtils';

// Al seleccionar una fecha
const formattedDate = formatDateToString(selectedDate);

// Al cargar una fecha existente
const dateObj = parseDateString(dateString);
```

## Solución de Problemas

### Problema: Fecha se muestra un día antes
**Causa**: Problemas de conversión UTC
**Solución**: El sistema ahora usa la zona horaria local del usuario

### Problema: Filtros de fecha no funcionan
**Causa**: Comparaciones de fecha incorrectas
**Solución**: Se usa `compareDates()` que compara solo año, mes y día

### Problema: Zona horaria no se detecta
**Causa**: Navegador no soporta `Intl.DateTimeFormat`
**Solución**: Fallback automático a UTC

## Compatibilidad

- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Dispositivos móviles
- ✅ Diferentes zonas horarias
- ✅ Horario de verano (DST)
- ✅ Fallback a UTC para navegadores antiguos

## Testing

Para probar diferentes zonas horarias:

1. **Cambiar zona horaria del sistema**:
   - Windows: Configuración > Hora e idioma > Zona horaria
   - macOS: Preferencias del Sistema > General > Zona horaria
   - Linux: `sudo timedatectl set-timezone America/New_York`

2. **Usar herramientas de desarrollador**:
   - Chrome DevTools: Emulation > Sensors > Location
   - Firefox DevTools: Responsive Design Mode > Custom size

3. **Verificar en la consola**:
   ```javascript
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
   console.log(new Date().getTimezoneOffset());
   ``` 