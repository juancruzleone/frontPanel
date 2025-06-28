import * as yup from 'yup';

export const validateWorkOrderForm = async (data: any) => {
  const schema = yup.object().shape({
    titulo: yup
      .string()
      .required('El título es obligatorio')
      .min(3, 'El título debe tener al menos 3 caracteres')
      .max(200, 'El título no puede tener más de 200 caracteres'),
    descripcion: yup
      .string()
      .required('La descripción es obligatoria')
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(1000, 'La descripción no puede tener más de 1000 caracteres'),
    instalacionId: yup.string().required('La instalación es obligatoria'),
    prioridad: yup
      .string()
      .required('La prioridad es obligatoria')
      .oneOf(['baja', 'media', 'alta', 'critica'], 'La prioridad debe ser válida'),
    fechaProgramada: yup
      .date()
      .required('La fecha programada es obligatoria')
      .min(new Date(), 'La fecha programada no puede ser en el pasado'),
    horaProgramada: yup
      .string()
      .required('La hora programada es obligatoria')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'La hora debe tener formato HH:MM'),
    tipoTrabajo: yup
      .string()
      .required('El tipo de trabajo es obligatorio')
      .oneOf(['mantenimiento', 'reparacion', 'instalacion', 'inspeccion', 'otro'], 'El tipo de trabajo debe ser válido'),
    observaciones: yup.string().max(500, 'Las observaciones no pueden tener más de 500 caracteres'),
  });

  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((error: any) => {
      errors[error.path] = error.message;
    });
    return { isValid: false, errors };
  }
};

export const validateWorkOrderCompletion = async (data: any) => {
  const schema = yup.object().shape({
    trabajoRealizado: yup
      .string()
      .required('El trabajo realizado es obligatorio')
      .min(10, 'El trabajo realizado debe tener al menos 10 caracteres'),
    observaciones: yup
      .string()
      .required('Las observaciones son obligatorias')
      .min(10, 'Las observaciones deben tener al menos 10 caracteres'),
    tiempoTrabajo: yup
      .number()
      .required('El tiempo de trabajo es obligatorio')
      .positive('El tiempo de trabajo debe ser positivo')
      .max(24, 'El tiempo de trabajo no puede ser mayor a 24 horas'),
    estadoDispositivo: yup
      .string()
      .oneOf(
        ['Activo', 'Inactivo', 'En mantenimiento', 'Fuera de servicio', 'Pendiente de revisión'],
        'El estado del dispositivo debe ser válido'
      ),
  });

  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((error: any) => {
      errors[error.path] = error.message;
    });
    return { isValid: false, errors };
  }
};