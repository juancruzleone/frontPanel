import * as yup from 'yup';

export const getWorkOrderSchema = (t: (key: string) => string) =>
  yup.object().shape({
    titulo: yup
      .string()
      .required(t('workOrders.validation.titleRequired'))
      .min(3, t('workOrders.validation.titleMin'))
      .max(200, t('workOrders.validation.titleMax')),
    descripcion: yup
      .string()
      .required(t('workOrders.validation.descriptionRequired'))
      .min(10, t('workOrders.validation.descriptionMin'))
      .max(1000, t('workOrders.validation.descriptionMax')),
    instalacionId: yup.string().required(t('workOrders.validation.installationRequired')),
    prioridad: yup
      .string()
      .required(t('workOrders.validation.priorityRequired'))
      .oneOf(['baja', 'media', 'alta', 'critica'], t('workOrders.validation.priorityInvalid')),
    fechaProgramada: yup
      .date()
      .required(t('workOrders.validation.scheduledDateRequired'))
      .min(new Date(), t('workOrders.validation.scheduledDateMin')),
    horaProgramada: yup
      .string()
      .required(t('workOrders.validation.scheduledTimeRequired'))
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, t('workOrders.validation.scheduledTimeFormat')),
    tipoTrabajo: yup
      .string()
      .required(t('workOrders.validation.workTypeRequired'))
      .oneOf(['mantenimiento', 'reparacion', 'instalacion', 'inspeccion', 'otro'], t('workOrders.validation.workTypeInvalid')),
    tipoOrden: yup
      .string()
      .required(t('workOrders.validation.orderTypeRequired'))
      .oneOf(['preventivo', 'correctivo'], t('workOrders.validation.orderTypeInvalid')),
    observaciones: yup.string().max(500, t('workOrders.validation.observationsMax')),
    estado: yup.string(),
    tecnicosIds: yup.array().of(yup.string()),
    tecnicosAsignados: yup.array().of(yup.string()),
    tecnicoAsignado: yup.string(),
  }).test(
    'technician-required-for-assigned',
    t('workOrders.validation.technicianRequiredForAssigned'),
    function (values) {
      if (values.estado === 'asignada') {
        const hasTechnicians = 
          (Array.isArray(values.tecnicosIds) && values.tecnicosIds.length > 0) || 
          (Array.isArray(values.tecnicosAsignados) && values.tecnicosAsignados.length > 0) ||
          !!values.tecnicoAsignado;
        
        if (!hasTechnicians) {
          return this.createError({
            path: 'estado',
            message: t('workOrders.validation.technicianRequiredForAssigned')
          });
        }
      }
      return true;
    }
  );

export const validateWorkOrderForm = async (data: Record<string, unknown>, t: (key: string) => string) => {
  const schema = getWorkOrderSchema(t);

  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: unknown) {
    const errors: Record<string, string> = {};
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((error) => {
        if (error.path) errors[error.path] = error.message;
      });
    }
    return { isValid: false, errors };
  }
};

export const validateWorkOrderCompletion = async (data: Record<string, unknown>, t: (key: string) => string) => {
  const schema = yup.object().shape({
    trabajoRealizado: yup
      .string()
      .required(t('workOrders.validation.completion.workDoneRequired'))
      .min(10, t('workOrders.validation.completion.workDoneMin')),
    observaciones: yup
      .string()
      .required(t('workOrders.validation.completion.observationsRequired'))
      .min(10, t('workOrders.validation.completion.observationsMin')),
    tiempoTrabajo: yup
      .number()
      .required(t('workOrders.validation.completion.timeRequired'))
      .positive(t('workOrders.validation.completion.timePositive'))
      .max(24, t('workOrders.validation.completion.timeMax')),
    estadoDispositivo: yup
      .string()
      .oneOf(
        ['Activo', 'Inactivo', 'En mantenimiento', 'Fuera de servicio', 'Pendiente de revisión'],
        t('workOrders.validation.completion.deviceStateInvalid')
      ),
  });

  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: unknown) {
    const errors: Record<string, string> = {};
    if (err instanceof yup.ValidationError) {
      err.inner.forEach((error) => {
        if (error.path) errors[error.path] = error.message;
      });
    }
    return { isValid: false, errors };
  }
};

export const validateWorkOrderField = async (
  fieldName: string,
  value: unknown,
  allData: Record<string, unknown>,
  t: (key: string) => string
) => {
  const schema = getWorkOrderSchema(t)
  try {
    await schema.validateAt(fieldName, { ...allData, [fieldName]: value })
    return { isValid: true, error: null }
  } catch (err: unknown) {
    return { isValid: false, error: (err as Error).message }
  }
}
