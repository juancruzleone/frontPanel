import * as yup from 'yup';

export const validateWorkOrderForm = async (data: any, t: (key: string) => string) => {
  const schema = yup.object().shape({
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
    observaciones: yup.string().max(500, t('workOrders.validation.observationsMax')),
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

export const validateWorkOrderCompletion = async (data: any, t: (key: string) => string) => {
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
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((error: any) => {
      errors[error.path] = error.message;
    });
    return { isValid: false, errors };
  }
};

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
    observaciones: yup.string().max(500, t('workOrders.validation.observationsMax')),
  })

export const validateWorkOrderField = async (
  fieldName: string,
  value: any,
  allData: any,
  t: (key: string) => string
) => {
  const schema = getWorkOrderSchema(t)
  try {
    await schema.validateAt(fieldName, { ...allData, [fieldName]: value })
    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}