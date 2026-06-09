import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchInstallations } from '../../installations/services/installationServices'
import type { Installation } from '../../installations/hooks/useInstallations'
import { useAuthStore } from '../../../../src/store/authStore.ts'
import { useInstallationStore } from '../../../../src/store/installationStore.ts'
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
  const { installations: cachedInstallations, ownerId } = useInstallationStore()
  const { userId } = useAuthStore()
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [config, setConfig] = useState<{ frequencies: { id?: string, value?: string }[] } | null>(null)

  const validCachedInstallations = userId && ownerId === userId ? cachedInstallations : []

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "/api/"
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

  const mapInstallationToSubscription = useCallback((installation: Installation): Subscription => {
    const mapStatusToEnglish = (estado: string): 'active' | 'inactive' | 'pending' => {
      const statusMap: Record<string, 'active' | 'inactive' | 'pending'> = {
        'Activo': 'active',
        'Inactivo': 'inactive',
        'Pendiente': 'pending',
        'active': 'active',
        'inactive': 'inactive',
        'pending': 'pending'
      }
      return statusMap[estado] || 'active'
    }

    const parseDate = (dateInput: string | Date | undefined): Date | undefined => {
      if (!dateInput) return undefined
      if (dateInput instanceof Date) return dateInput
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        const [, year, month, day] = match
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      return new Date(dateInput)
    }

    const startDate = parseDate(installation.fechaInicio)
    const endDate = parseDate(installation.fechaFin)
    const frequency = installation.frecuencia ? installation.frecuencia.toLowerCase() : ''
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
  }, [])

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!navigator.onLine && validCachedInstallations.length > 0) {
        setInstallations(validCachedInstallations as unknown as Installation[])
        const subscriptionsData = (validCachedInstallations as unknown as Installation[]).map(mapInstallationToSubscription)
        setSubscriptions(subscriptionsData)
        setLoading(false)
        return
      }

      const response = await fetchInstallations()
      const installationsData = response.data || []

      setInstallations(installationsData)
      const subscriptionsData = installationsData.map(mapInstallationToSubscription)

      setSubscriptions(subscriptionsData)
    } catch (err: unknown) {
      if (validCachedInstallations.length > 0) {
        setInstallations(validCachedInstallations as unknown as Installation[])
        const subscriptionsData = (validCachedInstallations as unknown as Installation[]).map(mapInstallationToSubscription)
        setSubscriptions(subscriptionsData)
      } else {
        setError((err as Error).message || 'Error al cargar abonos')
      }
    } finally {
      setLoading(false)
    }
  }, [t, validCachedInstallations, mapInstallationToSubscription])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const refreshSubscriptions = useCallback(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>) => {
    const installation = installations.find(inst => inst._id === subscriptionId)
    if (!installation) throw new Error(t('subscriptions.installationNotFound'))

    const monthsToSave = data.months || []

    const mapFrequency = (freq: string): string => {
        const frequencyMap: Record<string, string> = {
          'mensual': 'Mensual',
          'trimestral': 'Trimestral',
          'semestral': 'Semestral',
          'anual': 'Anual',
          'monthly': 'Mensual',
          'quarterly': 'Trimestral',
          'semiannual': 'Semestral',
          'annual': 'Anual'
        }
        return frequencyMap[freq?.toLowerCase()] || freq
      }

    const formatDateForBackend = (dateInput: string | Date | undefined) => {
      if (!dateInput) return null
      if (dateInput instanceof Date) {
        const year = dateInput.getFullYear()
        const month = String(dateInput.getMonth() + 1).padStart(2, '0')
        const day = String(dateInput.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const dateStr = dateInput
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const mapStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'active': 'Activo',
        'inactive': 'Inactivo',
        'pending': 'Pendiente'
      }
      return statusMap[status] || status
    }

    const updateData = {
      company: installation.company,
      address: installation.address,
      floorSector: installation.floorSector,
      postalCode: installation.postalCode,
      city: installation.city,
      province: installation.province,
      installationType: installation.installationType,
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
  }, [])

  const handleFieldBlur = useCallback(async (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    const fieldValue = formData[name as keyof typeof formData]
    if (fieldValue && fieldValue !== '') return

    const fieldMapping: Record<string, string> = {
      'frequency': 'tipo',
      'startDate': 'fechaInicio',
      'endDate': 'fechaFin',
      'status': 'estado'
    }
    const validationFieldName = fieldMapping[name] || name
    const fieldToValidate: Record<string, string> = { [validationFieldName]: '' }
    if (name === 'endDate' && formData.startDate) fieldToValidate['fechaInicio'] = formData.startDate

    try {
      const validation = await validateSubscriptionForm(fieldToValidate, t)
      setFormErrors(prev => ({ ...prev, [validationFieldName]: validation.errors[validationFieldName] || '' }))
    } catch (error) {
      console.error('Error in field validation:', error);
    }
  }, [formData, t])

  const handleFieldFocus = useCallback((name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }))
  }, [])

  const validateAllFields = useCallback(async () => {
    setTouchedFields({ frequency: true, startDate: true, endDate: true, status: true })
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

  const resetForm = useCallback(() => {
    setFormData({ frequency: '', startDate: '', endDate: '', status: 'active' })
    setFormErrors({})
    setTouchedFields({})
  }, [])

  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)
  const [isError, setIsError] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [monthsError, setMonthsError] = useState("")

  const handleMonthClick = (month: string) => {
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

  const canSave = () => true

  const handleStartDateClose = () => { setIsStartDatePickerOpen(false) }
  const handleEndDateClose = () => { setIsEndDatePickerOpen(false) }

  const handleStartDateSelect = useCallback(async (date: string) => {
    handleFieldChange('startDate', date)
    setIsStartDatePickerOpen(false)
    setTouchedFields(prev => ({ ...prev, startDate: true }))
    if (formData.endDate && date > formData.endDate) {
      const validation = await validateSubscriptionForm({ fechaInicio: date, fechaFin: formData.endDate }, t)
      if (validation.errors['fechaFin']) setFormErrors(prev => ({ ...prev, fechaFin: validation.errors['fechaFin'] }))
    } else if (formData.endDate && date <= formData.endDate) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['fechaFin']
        return newErrors
      })
    }
  }, [handleFieldChange, formData.endDate, t])

  const handleEndDateSelect = useCallback(async (date: string) => {
    handleFieldChange('endDate', date)
    setIsEndDatePickerOpen(false)
    setTouchedFields(prev => ({ ...prev, endDate: true }))
    if (formData.startDate && date < formData.startDate) {
      const validation = await validateSubscriptionForm({ fechaInicio: formData.startDate, fechaFin: date }, t)
      if (validation.errors['fechaFin']) setFormErrors(prev => ({ ...prev, fechaFin: validation.errors['fechaFin'] }))
    } else if (formData.startDate && date >= formData.startDate) {
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

  const resetFrequencyForm = useCallback(() => {
    resetForm()
    setSelectedMonths([])
    setIsStartDatePickerOpen(false)
    setIsEndDatePickerOpen(false)
    setIsError(false)
    setResponseMessage("")
    setMonthsError("")
  }, [resetForm])

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
