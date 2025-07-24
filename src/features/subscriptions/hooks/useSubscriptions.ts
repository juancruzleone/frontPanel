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
    
    // Solo limpiar el error del campo específico si tiene un valor válido
    if (value) {
      const fieldMapping: Record<string, string> = {
        'frequency': 'tipo',
        'startDate': 'fechaInicio',
        'endDate': 'fechaFin',
        'status': 'estado'
      }
      
      const validationFieldName = fieldMapping[name] || name
      
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[validationFieldName]
        return newErrors
      })
    }
    
    if (name === 'frequency') {
      // Reset selected months when frequency changes
      if (value === 'mensual' || value === 'anual') {
        setSelectedMonths(getMonthsByFrequency(value))
      } else {
        setSelectedMonths([])
      }
    }
  }, [])

  // CAMBIO PRINCIPAL: handleFieldBlur mejorado
  const handleFieldBlur = useCallback(async (name: string) => {
    // Marcar el campo como tocado SIEMPRE
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    
    // Mapear nombres de campos
    const fieldMapping: Record<string, string> = {
      'frequency': 'tipo',
      'startDate': 'fechaInicio',
      'endDate': 'fechaFin',
      'status': 'estado'
    }
    
    const validationFieldName = fieldMapping[name] || name
    const fieldValue = formData[name as keyof typeof formData]
    
    // Crear objeto con el campo a validar
    const fieldToValidate: any = {
      [validationFieldName]: fieldValue || ''
    }
    
    // Para fecha fin, incluir fecha inicio para validación cruzada
    if (name === 'endDate' && formData.startDate) {
      fieldToValidate['fechaInicio'] = formData.startDate
    }
    
    try {
      const validation = await validateSubscriptionForm(fieldToValidate, t)
      
      // Actualizar solo el error del campo específico
      setFormErrors(prev => ({
        ...prev,
        [validationFieldName]: validation.errors[validationFieldName] || ''
      }))
    } catch (error) {
      console.error('Error validating field:', error)
    }
  }, [formData, t])

  // NUEVO: Función para marcar campo como tocado cuando se abre un DatePicker
  const handleFieldFocus = useCallback((name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }))
  }, [])

  const validateAllFields = useCallback(async () => {
    // Marcar todos los campos como tocados
    setTouchedFields({
      frequency: true,
      startDate: true,
      endDate: true,
      status: true
    })
    
    // Validar todos los campos con valores vacíos si no tienen valor
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency || '',
      fechaInicio: formData.startDate || '',
      fechaFin: formData.endDate || '',
      estado: formData.status || 'active',
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

  // Handler para cerrar DatePicker con validación
  const handleStartDateClose = () => {
    setIsStartDatePickerOpen(false)
    // Validar si el campo está vacío
    if (!formData.startDate) {
      setTimeout(() => {
        handleFieldBlur('startDate')
      }, 100)
    }
  }

  const handleEndDateClose = () => {
    setIsEndDatePickerOpen(false)
    // Validar si el campo está vacío
    if (!formData.endDate) {
      setTimeout(() => {
        handleFieldBlur('endDate')
      }, 100)
    }
  }

  // CAMBIO: Mejorar handlers de selección de fecha
  const handleStartDateSelect = useCallback(async (date: string) => {
    // Actualizar el valor
    handleFieldChange('startDate', date)
    setIsStartDatePickerOpen(false)
    
    // Limpiar cualquier error existente inmediatamente
    setFormErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors['fechaInicio']
      return newErrors
    })
    
    // Marcar como tocado
    setTouchedFields(prev => ({ ...prev, startDate: true }))
  }, [handleFieldChange])

  const handleEndDateSelect = useCallback(async (date: string) => {
    // Actualizar el valor
    handleFieldChange('endDate', date)
    setIsEndDatePickerOpen(false)
    
    // Limpiar cualquier error existente inmediatamente
    setFormErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors['fechaFin']
      return newErrors
    })
    
    // Marcar como tocado
    setTouchedFields(prev => ({ ...prev, endDate: true }))
    
    // Validar SOLO si ya tenemos fecha de inicio para la validación cruzada
    if (formData.startDate && date) {
      setTimeout(async () => {
        const fieldToValidate: any = {
          fechaFin: date,
          fechaInicio: formData.startDate
        }
        
        try {
          const validation = await validateSubscriptionForm(fieldToValidate, t)
          if (validation.errors['fechaFin']) {
            setFormErrors(prev => ({
              ...prev,
              fechaFin: validation.errors['fechaFin']
            }))
          }
        } catch (error) {
          console.error('Error validating end date:', error)
        }
      }, 200)
    }
  }, [formData.startDate, handleFieldChange, t])

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
    setTouchedFields,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    handleFieldFocus, // NUEVO
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