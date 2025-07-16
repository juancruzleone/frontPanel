import * as yup from "yup"

export const getFormFieldSchema = (t: (key: string) => string) =>
  yup.object().shape({
    name: yup
      .string()
      .required(t("forms.validation.fieldNameRequired"))
      .matches(/^[a-zA-Z0-9_]+$/, t("forms.validation.fieldNameInvalid")),
    type: yup
      .string()
      .required(t("forms.validation.fieldTypeRequired"))
      .oneOf(["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"], t("forms.validation.fieldTypeInvalid")),
    label: yup.string().required(t("forms.validation.fieldLabelRequired")),
    required: yup.boolean().default(false),
    options: yup.mixed().when("type", {
      is: (val: string) => val === "select" || val === "radio",
      then: () =>
        yup
          .array()
          .of(yup.string())
          .min(1, t("forms.validation.fieldOptionsMin"))
          .required(t("forms.validation.fieldOptionsRequired")),
      otherwise: () => yup.mixed().notRequired(),
    }),
    placeholder: yup.string().notRequired(),
    defaultValue: yup.mixed().notRequired(),
    min: yup.number().notRequired(),
    max: yup.number().notRequired(),
    step: yup.number().positive().notRequired(),
    helpText: yup.string().notRequired(),
  })

export const getFormTemplateSchema = (t: (key: string) => string) =>
  yup.object().shape({
    nombre: yup
      .string()
      .required(t("forms.validation.templateNameRequired"))
      .max(100, t("forms.validation.templateNameMax")),
    descripcion: yup.string().max(500, t("forms.validation.templateDescriptionMax")).notRequired(),
    categoria: yup
      .string()
      .required(t("forms.validation.categoryRequired"))
      .max(50, t("forms.validation.categoryMax")),
    campos: yup
      .array()
      .of(getFormFieldSchema(t))
      .min(1, t("forms.validation.fieldsMin"))
      .required(t("forms.validation.fieldsRequired")),
  })

export const validateFormTemplate = async (data: any, t: (key: string) => string) => {
  const formTemplateSchema = getFormTemplateSchema(t)
  try {
    await formTemplateSchema.validate(data, { abortEarly: false })
    return { isValid: true, errors: {} }
  } catch (err: any) {
    const errors: Record<string, string> = {}

    if (err.inner && Array.isArray(err.inner)) {
      err.inner.forEach((e: any) => {
        if (e.path) {
          errors[e.path] = e.message
        }
      })
    } else if (err.path) {
      errors[err.path] = err.message
    } else {
      errors._error = err.message || t("forms.validation.unknownError")
    }

    return { isValid: false, errors }
  }
}

export const validateFormField = async (fieldName: string, value: any, allData: any, t: (key: string) => string) => {
  const formTemplateSchema = getFormTemplateSchema(t)
  try {
    await formTemplateSchema.validateAt(fieldName, { ...allData, [fieldName]: value })
    return { isValid: true, error: null }
  } catch (err: any) {
    return { isValid: false, error: err.message }
  }
}
