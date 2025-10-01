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
    
    // Limpiar el error del campo específico inmediatamente cuando hay un valor válido
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
      if (value === 'mensual') {
        // Para mensual, seleccionar todos los meses a partir de la fecha de inicio
        const allMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        setSelectedMonths(allMonths)
      } else if (value === 'anual') {
        // Para anual, seleccionar solo el mes de la fecha de inicio
        const currentStartDate = formData.startDate
        if (currentStartDate) {
          const startDate = new Date(currentStartDate)
          const monthIndex = startDate.getMonth()
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          setSelectedMonths([monthNames[monthIndex]])
        } else {
          setSelectedMonths([])
        }
      } else if (value === 'trimestral') {
        // Para trimestral, seleccionar 4 meses alternados a partir del mes de inicio
        const currentStartDate = formData.startDate
        if (currentStartDate) {
          const startDate = new Date(currentStartDate)
          const monthIndex = startDate.getMonth()
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          
          let selectedMonthsArray: string[] = []
          // Seleccionar mes de inicio + cada 3 meses
          for (let i = 0; i < 4; i++) {
            const monthToAdd = monthNames[(monthIndex + (i * 3)) % 12]
            if (!selectedMonthsArray.includes(monthToAdd)) {
              selectedMonthsArray.push(monthToAdd)
            }
          }
          setSelectedMonths(selectedMonthsArray)
        } else {
          setSelectedMonths([])
        }
      } else if (value === 'semestral') {
        // Para semestral, seleccionar 2 meses alternados a partir del mes de inicio
        const currentStartDate = formData.startDate
        if (currentStartDate) {
          const startDate = new Date(currentStartDate)
          const monthIndex = startDate.getMonth()
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          
          let selectedMonthsArray: string[] = []
          // Seleccionar mes de inicio + 6 meses después
          for (let i = 0; i < 2; i++) {
            const monthToAdd = monthNames[(monthIndex + (i * 6)) % 12]
            if (!selectedMonthsArray.includes(monthToAdd)) {
              selectedMonthsArray.push(monthToAdd)
            }
          }
          setSelectedMonths(selectedMonthsArray)
        } else {
          setSelectedMonths([])
        }
      } else {
        setSelectedMonths([])
      }
    }
    
    // Si cambia la fecha de inicio, recalcular meses para frecuencias que dependen de ella
    if (name === 'startDate' && value) {
      const currentFrequency = formData.frequency
      if (currentFrequency === 'anual') {
        const startDate = new Date(value)
        const monthIndex = startDate.getMonth()
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        setSelectedMonths([monthNames[monthIndex]])
      } else if (currentFrequency === 'trimestral') {
        const startDate = new Date(value)
        const monthIndex = startDate.getMonth()
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        let selectedMonthsArray: string[] = []
        // Seleccionar mes de inicio + cada 3 meses
        for (let i = 0; i < 4; i++) {
          const monthToAdd = monthNames[(monthIndex + (i * 3)) % 12]
          if (!selectedMonthsArray.includes(monthToAdd)) {
            selectedMonthsArray.push(monthToAdd)
          }
        }
        setSelectedMonths(selectedMonthsArray)
      } else if (currentFrequency === 'semestral') {
        const startDate = new Date(value)
        const monthIndex = startDate.getMonth()
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        let selectedMonthsArray: string[] = []
        // Seleccionar mes de inicio + 6 meses después
        for (let i = 0; i < 2; i++) {
          const monthToAdd = monthNames[(monthIndex + (i * 6)) % 12]
          if (!selectedMonthsArray.includes(monthToAdd)) {
            selectedMonthsArray.push(monthToAdd)
          }
        }
        setSelectedMonths(selectedMonthsArray)
      }
    }
  }, [formData.frequency, formData.startDate])

  // Función de blur simplificada - solo valida campos vacíos
  const handleFieldBlur = useCallback(async (name: string) => {
    // Marcar el campo como tocado
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    
    // Solo validar si el campo está vacío
    const fieldValue = formData[name as keyof typeof formData]
    if (fieldValue && fieldValue !== '') {
      return // No validar si hay valor
    }
    
    const fieldMapping: Record<string, string> = {
      'frequency': 'tipo',
      'startDate': 'fechaInicio',
      'endDate': 'fechaFin',
      'status': 'estado'
    }
    
    const validationFieldName = fieldMapping[name] || name
    
    // Crear objeto con el campo a validar
    const fieldToValidate: any = {
      [validationFieldName]: ''
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

  // Función para marcar campo como tocado cuando se abre un DatePicker
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
    
    // Validar todos los campos
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
  const [monthsError, setMonthsError] = useState("")

  const handleMonthClick = (month: string) => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthIndex = monthNames.indexOf(month)
    
    // Función para verificar si un mes es consecutivo a los ya seleccionados
    const isConsecutive = (newMonthIndex: number, selectedMonthsArray: string[]): boolean => {
      for (const selectedMonth of selectedMonthsArray) {
        const selectedIndex = monthNames.indexOf(selectedMonth)
        // Verificar consecutividad considerando el ciclo del año (Diciembre -> Enero)
        const diff = Math.abs(newMonthIndex - selectedIndex)
        if (diff === 1 || diff === 11) {
          return true
        }
      }
      return false
    }
    
    if (formData.frequency === 'semestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
        // Limpiar error al deseleccionar
        setMonthsError("")
      } else if (selectedMonths.length < 2) {
        // Validar que no sea consecutivo
        if (selectedMonths.length > 0 && isConsecutive(monthIndex, selectedMonths)) {
          setMonthsError(t('subscriptions.errors.consecutiveMonthsNotAllowed') || 'No se pueden seleccionar meses consecutivos')
          return
        }
        setSelectedMonths([...selectedMonths, month])
        // Limpiar error al seleccionar correctamente
        setMonthsError("")
      }
    } else if (formData.frequency === 'trimestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
        // Limpiar error al deseleccionar
        setMonthsError("")
      } else if (selectedMonths.length < 4) {
        // Validar que no sea consecutivo
        if (selectedMonths.length > 0 && isConsecutive(monthIndex, selectedMonths)) {
          setMonthsError(t('subscriptions.errors.consecutiveMonthsNotAllowed') || 'No se pueden seleccionar meses consecutivos')
          return
        }
        setSelectedMonths([...selectedMonths, month])
        // Limpiar error al seleccionar correctamente
        setMonthsError("")
      }
    } else if (formData.frequency === 'anual') {
      // Para anual, solo permitir un mes seleccionado
      if (selectedMonths.includes(month)) {
        setSelectedMonths([])
      } else {
        setSelectedMonths([month])
      }
    } else if (formData.frequency === 'mensual') {
      // Para mensual, permitir seleccionar/deseleccionar cualquier mes
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else {
        setSelectedMonths([...selectedMonths, month])
      }
    }
  }

  const isMonthSelectable = (month: string) => {
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  const canSave = () => {
    // Siempre permitir guardar - la validación se hace en el submit
    return true
  }

  // Handler para cerrar DatePicker - MODIFICADO para no validar automáticamente
  const handleStartDateClose = () => {
    setIsStartDatePickerOpen(false)
    // NO validar automáticamente al cerrar
  }

  const handleEndDateClose = () => {
    setIsEndDatePickerOpen(false)
    // NO validar automáticamente al cerrar
  }

  // Handlers mejorados para selección de fecha - MODIFICADOS
  const handleStartDateSelect = useCallback(async (date: string) => {
    // Actualizar el valor usando handleFieldChange para limpiar errores automáticamente
    handleFieldChange('startDate', date)
    setIsStartDatePickerOpen(false)
    
    // Marcar como tocado
    setTouchedFields(prev => ({ ...prev, startDate: true }))
    
    // Validar fecha fin si existe y podría ser inválida
    if (formData.endDate && date > formData.endDate) {
      const validation = await validateSubscriptionForm({
        fechaInicio: date,
        fechaFin: formData.endDate
      }, t)
      
      if (validation.errors['fechaFin']) {
        setFormErrors(prev => ({
          ...prev,
          fechaFin: validation.errors['fechaFin']
        }))
      }
    } else if (formData.endDate && date <= formData.endDate) {
      // Si la nueva fecha de inicio hace que la fecha fin sea válida, limpiar su error
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['fechaFin']
        return newErrors
      })
    }
  }, [handleFieldChange, formData.endDate, t])

  const handleEndDateSelect = useCallback(async (date: string) => {
    // Actualizar el valor usando handleFieldChange para limpiar errores automáticamente
    handleFieldChange('endDate', date)
    setIsEndDatePickerOpen(false)
    
    // Marcar como tocado
    setTouchedFields(prev => ({ ...prev, endDate: true }))
    
    // Validar si la fecha fin es anterior a la fecha inicio
    if (formData.startDate && date < formData.startDate) {
      const validation = await validateSubscriptionForm({
        fechaInicio: formData.startDate,
        fechaFin: date
      }, t)
      
      if (validation.errors['fechaFin']) {
        setFormErrors(prev => ({
          ...prev,
          fechaFin: validation.errors['fechaFin']
        }))
      }
    } else if (formData.startDate && date >= formData.startDate) {
      // Si la nueva fecha fin es válida, asegurar que no hay error
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['fechaFin']
        return newErrors
      })
    }
  }, [handleFieldChange, formData.startDate, t])

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
    setMonthsError("")
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
    handleFieldFocus,
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
    monthsError,
    setMonthsError,
  }
}

export { useSubscriptions }