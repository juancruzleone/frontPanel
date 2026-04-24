import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchInstallations } from '../../installations/services/installationServices'
import type { Installation } from '../../installations/hooks/useInstallations'
import { useAuthStore } from '../../../../src/store/authStore.ts'
import { getAuthHeaders } from '@/shared/utils/apiHeaders'
import {
  updateSubscription as updateSubscriptionService,
  triggerAutomaticWorkOrdersGeneration,
} from '../services/subscriptionServices'
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [config, setConfig] = useState<{ frequencies: { id?: string, value?: string }[] } | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL
        if (!isAuthenticated) return

        const response = await fetch(`${API_URL}config/subscriptions`, {
          headers: getAuthHeaders()
        })
        if (response.ok) {
          const result = await response.json()
          setConfig(result.data)
        }
      } catch (err) {
        console.error('Error fetching subscription config:', err);
      }
    }
    fetchConfig()
  }, [isAuthenticated])

  const frequencyOptions: FrequencyOption[] = (config?.frequencies || [
    { value: 'mensual', label: t('subscriptions.frequency.monthly') },
    { value: 'trimestral', label: t('subscriptions.frequency.quarterly') },
    { value: 'semestral', label: t('subscriptions.frequency.semiannual') },
    { value: 'anual', label: t('subscriptions.frequency.annual') }
  ]).map((f) => ({
    value: f.value || f.id || '',
    label: t(`subscriptions.frequency.${f.id || f.value}`),
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  }))

  // La lógica de cálculo de meses se ha movido al backend.
  // El frontend ahora solo muestra los meses guardados o permite selección manual.

  const mapInstallationToSubscription = (installation: Installation): Subscription => {
    // Mapear estado de español a inglés
    const mapStatusToEnglish = (estado: string): 'active' | 'inactive' | 'pending' => {
      const statusMap: Record<string, 'active' | 'inactive' | 'pending'> = {
        'Activo': 'active',
        'Inactivo': 'inactive',
        'Pendiente': 'pending',
        'active': 'active',
        'inactive': 'inactive',
        'pending': 'pending'
      }
      const mappedStatus = statusMap[estado] || 'active'
      return mappedStatus
    }

    // Parsear fecha sin conversión de zona horaria
    const parseDate = (dateInput: string | Date | undefined): Date | undefined => {
      if (!dateInput) return undefined
      // Si ya es un objeto Date, devolverlo
      if (dateInput instanceof Date) return dateInput
      // Si el string está en formato ISO (YYYY-MM-DD), parsearlo sin UTC
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        const [, year, month, day] = match
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      // Si no coincide, intentar parseo normal
      return new Date(dateInput)
    }

    const startDate = parseDate(installation.fechaInicio)
    const endDate = parseDate(installation.fechaFin)
    // Normalizar frecuencia a minúsculas para coincidir con las opciones del select
    const frequency = installation.frecuencia ? installation.frecuencia.toLowerCase() : ''

    // Obtener los meses directamente del objeto de instalación (calculados por el backend)
    const months = installation.mesesFrecuencia || []

    return {
      _id: installation._id || '',
      installationId: installation._id || '',
      installationName: installation.company,
      address: installation.address,
      city: installation.city || '',
      province: installation.province || '',
      installationType: installation.installationType,
      frequency: frequency,
      months: months,
      startDate: startDate,
      endDate: endDate,
      status: mapStatusToEnglish(installation.estado || 'Activo'),
      createdAt: installation.fechaCreacion ? new Date(installation.fechaCreacion) : new Date(),
      updatedAt: installation.fechaActualizacion ? new Date(installation.fechaActualizacion) : new Date(),
    }
  }

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchInstallations()
      const installationsData = response.data || []

      setInstallations(installationsData)
      const subscriptionsData = installationsData.map(mapInstallationToSubscription)

      setSubscriptions(subscriptionsData)
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al cargar abonos')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const refreshSubscriptions = useCallback(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>) => {
    const installation = installations.find(inst => inst._id === subscriptionId)
    if (!installation) throw new Error(t('subscriptions.installationNotFound'))

    // El backend se encarga de determinar los meses si no se envían o de validarlos.
    const monthsToSave = data.months || []

    // Mapear la frecuencia al formato esperado por el backend
    const mapFrequency = (freq: string): string => {
        const frequencyMap: Record<string, string> = {
          'mensual': 'Mensual',
          'trimestral': 'Trimestral',
          'semestral': 'Semestral',
          'anual': 'Anual',
          // Mapeo desde inglés (por si viene del backend en inglés)
          'monthly': 'Mensual',
          'quarterly': 'Trimestral',
          'semiannual': 'Semestral',
          'annual': 'Anual'
        }
        return frequencyMap[freq?.toLowerCase()] || freq
      }

    // Función para formatear fecha sin conversión de zona horaria
    const formatDateForBackend = (dateInput: string | Date | undefined) => {
      if (!dateInput) return null

      if (dateInput instanceof Date) {
        const year = dateInput.getFullYear()
        const month = String(dateInput.getMonth() + 1).padStart(2, '0')
        const day = String(dateInput.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const dateStr = dateInput
      // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
      }

      // Parsear y formatear sin conversión de zona horaria
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Mapear estado de inglés a español
    const mapStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'active': 'Activo',
        'inactive': 'Inactivo',
        'pending': 'Pendiente'
      }
      return statusMap[status] || status
    }

    // IMPORTANTE: Enviar TODOS los campos de la instalación para evitar errores de validación
    const updateData = {
      // Campos de la instalación existente (requeridos por el backend)
      company: installation.company,
      address: installation.address,
      floorSector: installation.floorSector,
      postalCode: installation.postalCode,
      city: installation.city,
      province: installation.province,
      installationType: installation.installationType,
      // Campos que estamos actualizando
      fechaInicio: data.startDate ? formatDateForBackend(data.startDate) : installation.fechaInicio,
      fechaFin: data.endDate ? formatDateForBackend(data.endDate) : installation.fechaFin,
      frecuencia: data.frequency ? mapFrequency(data.frequency) : installation.frecuencia,
      mesesFrecuencia: monthsToSave,
      estado: data.status ? mapStatus(data.status) : installation.estado || 'Activo',
      generacionAutomatica: (data.status ? mapStatus(data.status) : installation.estado || 'Activo') === 'Activo',
    }

    await updateSubscriptionService(subscriptionId, updateData)
    if (updateData.generacionAutomatica) {
      try {
        await triggerAutomaticWorkOrdersGeneration()
      } catch (error) {
        console.error('Error triggering automatic WO generation:', error);
      }
    }

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

  const handleFieldChange = useCallback((name: string, value: string | 'active' | 'inactive' | 'pending') => {
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

    // La actualización de meses ahora es manual o delegada al backend en el guardado
    // Por simplicidad en la UI, dejamos que el usuario elija los meses sin cálculos automáticos complejos
    // Por eso quitamos formData.frequency, formData.startDate, formData.endDate de las dependencias
  }, [])

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
    const fieldToValidate: Record<string, string> = {
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
      console.error('Error in field validation:', error);
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
    } catch (err: unknown) {
      onError((err as Error).message || t('subscriptions.errorUpdating'))
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
    // Selección simple de meses, las reglas de negocio complejas las valida el backend
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month))
    } else {
      setSelectedMonths([...selectedMonths, month])
    }
    setMonthsError("")
  }

  const isMonthSelectable = (_month: string) => {
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
