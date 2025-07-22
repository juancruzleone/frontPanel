import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchInstallations, updateInstallation } from '../../installations/services/installationServices'
import type { Installation } from '../../installations/hooks/useInstallations'
import { useAuthStore } from '../../../../src/store/authStore.ts'
import { updateSubscription as updateSubscriptionService } from '../services/subscriptionServices'
import { validateSubscriptionForm } from '../validators/subscriptionValidations';

export interface Subscription {
  _id: string
  installationId: string
  installationName: string
  address: string
  city: string
  province: string
  installationType: string
  frequency: string
  months: string[]
  startDate: Date | undefined
  endDate: Date | undefined
  status: 'active' | 'inactive' | 'pending'
  createdAt: Date
  updatedAt: Date
}

export interface FrequencyOption {
  value: string
  label: string
  months: string[]
}

const useSubscriptions = () => {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const frequencyOptions: FrequencyOption[] = [
    {
      value: 'mensual',
      label: t('subscriptions.frequency.monthly'),
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    },
    {
      value: 'trimestral',
      label: t('subscriptions.frequency.quarterly'),
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    },
    {
      value: 'semestral',
      label: t('subscriptions.frequency.semiannual'),
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    },
    {
      value: 'anual',
      label: t('subscriptions.frequency.annual'),
      months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    }
  ]

  const getMonthsByFrequency = (frequency: string): string[] => {
    const option = frequencyOptions.find(opt => opt.value === frequency)
    return option ? option.months : []
  }

  const mapInstallationToSubscription = (installation: Installation): Subscription => {
    return {
      _id: installation._id || '',
      installationId: installation._id || '',
      installationName: installation.company,
      address: installation.address,
      city: installation.city || '',
      province: installation.province || '',
      installationType: installation.installationType,
      frequency: installation.frecuencia || '',
      months: installation.mesesFrecuencia || getMonthsByFrequency(installation.frecuencia || ''),
      startDate: installation.fechaInicio ? new Date(installation.fechaInicio) : undefined,
      endDate: installation.fechaFin ? new Date(installation.fechaFin) : undefined,
      status: (installation.estado as 'active' | 'inactive' | 'pending') || 'active',
      createdAt: installation.fechaCreacion ? new Date(installation.fechaCreacion) : new Date(),
      updatedAt: installation.fechaActualizacion ? new Date(installation.fechaActualizacion) : new Date(),
    }
  }

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const installationsData = await fetchInstallations()
      setInstallations(installationsData)
      const subscriptionsData = installationsData.map(mapInstallationToSubscription)
      setSubscriptions(subscriptionsData)
    } catch (err: any) {
      setError(err.message || 'Error al cargar abonos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const refreshSubscriptions = useCallback(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>) => {
    const installation = installations.find(inst => inst._id === subscriptionId)
    if (!installation) throw new Error(t('subscriptions.installationNotFound'))
    
    // Determinar los meses según la frecuencia
    let monthsToSave = data.months || []
    
    if (data.frequency) {
      if (data.frequency === 'mensual' || data.frequency === 'anual') {
        // Para mensual y anual, todos los meses
        monthsToSave = getMonthsByFrequency(data.frequency)
      } else if (data.months && data.months.length > 0) {
        // Para trimestral y semestral, usar los meses seleccionados
        monthsToSave = data.months
      } else {
        // Si no hay meses seleccionados, mantener los existentes
        monthsToSave = installation.mesesFrecuencia || []
      }
    }
    
    // Mapear la frecuencia al formato esperado por el backend
    const mapFrequency = (freq: string): string => {
      const frequencyMap: Record<string, string> = {
        'mensual': 'Mensual',
        'trimestral': 'Trimestral',
        'semestral': 'Semestral',
        'anual': 'Anual'
      }
      return frequencyMap[freq] || freq
    }
    
    const updateData = {
      fechaInicio: data.startDate ? new Date(data.startDate).toISOString() : installation.fechaInicio,
      fechaFin: data.endDate ? new Date(data.endDate).toISOString() : installation.fechaFin,
      frecuencia: data.frequency ? mapFrequency(data.frequency) : installation.frecuencia,
      mesesFrecuencia: monthsToSave,
    }
    
    await updateSubscriptionService(subscriptionId, updateData)
    await loadSubscriptions()
  }

  const [formData, setFormData] = useState<{
    frequency: string
    startDate: string
    endDate: string
    status: 'active' | 'inactive' | 'pending'
  }>({
    frequency: '',
    startDate: '',
    endDate: '',
    status: 'active',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // CAMBIO IMPORTANTE: Solo limpiar el error del campo específico que cambió
    const fieldMapping: Record<string, string> = {
      'frequency': 'tipo',
      'startDate': 'fechaInicio',
      'endDate': 'fechaFin',
      'status': 'estado'
    }
    
    const validationFieldName = fieldMapping[name] || name
    
    // Solo limpiar el error del campo actual si tiene un valor válido
    if (value) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[validationFieldName]
        return newErrors
      })
    }
    
    // Marcar el campo como tocado
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    
    if (name === 'frequency') {
      // Reset selected months when frequency changes
      if (value === 'mensual' || value === 'anual') {
        setSelectedMonths(getMonthsByFrequency(value))
      } else {
        setSelectedMonths([])
      }
    }
  }, [])

  // ACTUALIZACIÓN: Mejorar el handleFieldBlur para validar SOLO el campo específico
  const handleFieldBlur = useCallback(async (name: string) => {
    // No hacer nada si el campo está vacío y no ha sido tocado previamente
    const fieldValue = formData[name as keyof typeof formData]
    const wasAlreadyTouched = touchedFields[name]
    
    // Marcar el campo como tocado
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    
    // Si el campo está vacío y no había sido tocado antes, no validar
    if (!fieldValue && !wasAlreadyTouched) {
      return
    }
    
    // Mapear nombres de campos del formulario a nombres de validación
    const fieldMapping: Record<string, string> = {
      'frequency': 'tipo',
      'startDate': 'fechaInicio',
      'endDate': 'fechaFin',
      'status': 'estado'
    }
    
    const validationFieldName = fieldMapping[name] || name
    
    // Solo validar el campo específico
    const fieldToValidate: any = {
      [validationFieldName]: fieldValue
    }
    
    // Para fechas, también necesitamos incluir la fecha de inicio si estamos validando fecha de fin
    if (name === 'endDate' && formData.startDate) {
      fieldToValidate['fechaInicio'] = formData.startDate
    }
    
    const validation = await validateSubscriptionForm(fieldToValidate, t)
    
    // Solo actualizar el error del campo específico, mantener otros errores existentes
    setFormErrors(prev => ({
      ...prev,
      [validationFieldName]: validation.errors[validationFieldName] || ''
    }))
  }, [formData, touchedFields, t])

  // NUEVA FUNCIÓN: Validar todos los campos y marcarlos como tocados
  const validateAllFields = useCallback(async () => {
    const allFields = ['frequency', 'startDate', 'endDate', 'status']
    
    // Marcar todos los campos como tocados
    const newTouchedFields: Record<string, boolean> = {}
    allFields.forEach(field => {
      newTouchedFields[field] = true
    })
    setTouchedFields(newTouchedFields)
    
    // Validar todos los campos
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }, t)
    
    setFormErrors(validation.errors)
    return validation.isValid
  }, [formData, t])

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    subscriptionId: string,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Validar todos los campos
    const isValid = await validateAllFields()
    
    if (!isValid) {
      setIsSubmitting(false)
      return
    }

    try {
      await updateSubscription(subscriptionId, {
        frequency: formData.frequency,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        status: formData.status as 'active' | 'inactive' | 'pending',
        months: selectedMonths,
      })
      onSuccess(t('subscriptions.frequencyUpdated'))
    } catch (err: any) {
      onError(err.message || t('subscriptions.errorUpdating'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({ frequency: '', startDate: '', endDate: '', status: 'active' })
    setFormErrors({})
    setTouchedFields({})
  }

  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)
  const [isError, setIsError] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")

  const handleMonthClick = (month: string) => {
    if (formData.frequency === 'semestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 2) {
        setSelectedMonths([...selectedMonths, month])
      }
    } else if (formData.frequency === 'trimestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 4) {
        setSelectedMonths([...selectedMonths, month])
      }
    }
  }

  const isMonthSelectable = (month: string) => {
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  const canSave = () => {
    if (formData.frequency === 'semestral') return selectedMonths.length === 2
    if (formData.frequency === 'trimestral') return selectedMonths.length === 4
    return true
  }

  const handleStartDateClose = () => {
    setIsStartDatePickerOpen(false)
  }

  const handleEndDateClose = () => {
    setIsEndDatePickerOpen(false)
  }

  const handleStartDateSelect = async (date: string) => {
    handleFieldChange('startDate', date)
    setIsStartDatePickerOpen(false)
    
    // Validar solo si hay una fecha válida
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Marcar como tocado primero
      setTouchedFields(prev => ({ ...prev, startDate: true }))
      
      // Validar el campo
      const validation = await validateSubscriptionForm({ fechaInicio: date }, t)
      
      // Actualizar solo el error de este campo
      setFormErrors(prev => ({
        ...prev,
        fechaInicio: validation.errors.fechaInicio || ''
      }))
    }
  }

  const handleEndDateSelect = async (date: string) => {
    handleFieldChange('endDate', date)
    setIsEndDatePickerOpen(false)
    
    // Validar solo si hay una fecha válida
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Marcar como tocado primero
      setTouchedFields(prev => ({ ...prev, endDate: true }))
      
      // Validar el campo
      const validation = await validateSubscriptionForm({ 
        fechaFin: date, 
        fechaInicio: formData.startDate 
      }, t)
      
      // Actualizar solo el error de este campo
      setFormErrors(prev => ({
        ...prev,
        fechaFin: validation.errors.fechaFin || ''
      }))
    }
  }

  const setFormErrorState = (error: boolean, message: string) => {
    setIsError(error)
    setResponseMessage(message)
  }

  const resetFrequencyForm = () => {
    resetForm()
    setSelectedMonths([])
    setIsStartDatePickerOpen(false)
    setIsEndDatePickerOpen(false)
    setIsError(false)
    setResponseMessage("")
  }

  return {
    subscriptions,
    installations,
    frequencyOptions,
    getMonthsByFrequency,
    loading,
    error,
    refreshSubscriptions,
    updateSubscription,
    formData,
    setFormData,
    formErrors,
    touchedFields,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    handleSubmitForm,
    resetForm,
    selectedMonths,
    setSelectedMonths,
    isStartDatePickerOpen,
    setIsStartDatePickerOpen,
    isEndDatePickerOpen,
    setIsEndDatePickerOpen,
    isError,
    setIsError,
    responseMessage,
    setResponseMessage,
    handleMonthClick,
    isMonthSelectable,
    isMonthSelected,
    canSave,
    handleStartDateClose,
    handleEndDateClose,
    handleStartDateSelect,
    handleEndDateSelect,
    setFormErrorState,
    resetFrequencyForm,
    validateAllFields,
  }
}

export default useSubscriptions