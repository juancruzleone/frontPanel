import * as yup from "yup";

export const formFieldSchema = yup.object().shape({
  name: yup
    .string()
    .required("El nombre del campo es obligatorio")
    .matches(/^[a-zA-Z0-9_]+$/, "El nombre del campo solo puede contener letras, números y guiones bajos"),
  type: yup
    .string()
    .required("El tipo de campo es obligatorio")
    .oneOf(["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"], "Tipo de campo no válido"),
  label: yup.string().required("La etiqueta del campo es obligatoria"),
  required: yup.boolean().default(false),
  options: yup.mixed().when("type", {
    is: (val: string) => val === "select" || val === "radio",
    then: yup.array()
      .of(yup.string())
      .min(1, "Debe proporcionar al menos una opción")
      .required("Las opciones son obligatorias para campos de tipo select o radio"),
    otherwise: yup.mixed().notRequired(),
  }),
  placeholder: yup.string().notRequired(),
  defaultValue: yup.mixed().notRequired(),
  min: yup.number().notRequired(),
  max: yup.number().notRequired(),
  step: yup.number().positive().notRequired(),
  helpText: yup.string().notRequired(),
});

export const formTemplateSchema = yup.object().shape({
  nombre: yup
    .string()
    .required("El nombre de la plantilla es obligatorio")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  descripcion: yup.string().max(500, "La descripción no puede tener más de 500 caracteres").notRequired(),
  categoria: yup
    .string()
    .required("La categoría es obligatoria")
    .max(50, "La categoría no puede tener más de 50 caracteres"),
  campos: yup.array()
    .of(formFieldSchema)
    .min(1, "Debe proporcionar al menos un campo")
    .required("Los campos son obligatorios"),
});

export const validateFormTemplate = async (data: any) => {
  try {
    await formTemplateSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err: any) {
    const errors: Record<string, string> = {};
    err.inner.forEach((e: any) => {
      errors[e.path] = e.message;
    });
    return { isValid: false, errors };
  }
};