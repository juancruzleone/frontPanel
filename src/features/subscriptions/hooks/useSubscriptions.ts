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

  // Opciones de frecuencia disponibles
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

  // Función para obtener meses según la frecuencia
  const getMonthsByFrequency = (frequency: string): string[] => {
    const option = frequencyOptions.find(opt => opt.value === frequency)
    return option ? option.months : []
  }

  // Mapear instalación a abono (subscription)
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
      // Cargar instalaciones reales
      const installationsData = await fetchInstallations()
      setInstallations(installationsData)
      // Mapear instalaciones a abonos
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

  // Función para actualizar abono (frecuencia, fechas, estado)
  const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>) => {
    const installation = installations.find(inst => inst._id === subscriptionId)
    if (!installation) throw new Error(t('subscriptions.installationNotFound'))
    const updateData: any = {
      ...installation,
      frecuencia: data.frequency || installation.frecuencia,
      fechaInicio: data.startDate || installation.fechaInicio,
      fechaFin: data.endDate || installation.fechaFin,
      estado: data.status || installation.estado,
      mesesFrecuencia: data.months || installation.mesesFrecuencia || getMonthsByFrequency(data.frequency || installation.frecuencia || ''),
    }
    await updateSubscriptionService(subscriptionId, updateData)
    await loadSubscriptions()
  }

  // Estado para el formulario de edición de suscripción
  const [formData, setFormData] = useState<{
    frequency?: string
    startDate?: string | Date
    endDate?: string | Date
    status?: string
  }>({
    frequency: '',
    startDate: '',
    endDate: '',
    status: 'active',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Manejar cambios de campo
  const handleFieldChange = async (name: string, value: any) => {
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)
    setTouchedFields((prev) => ({ ...prev, [name]: true }))
    const validation = await validateSubscriptionForm({
      tipo: updatedData.frequency,
      fechaInicio: updatedData.startDate,
      fechaFin: updatedData.endDate,
      estado: updatedData.status,
    }, t)
    setFormErrors(validation.errors)
  }

  // Manejar blur de campo
  const handleFieldBlur = async (name: string) => {
    setTouchedFields((prev) => ({ ...prev, [name]: true }))
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }, t)
    setFormErrors(validation.errors)
  }

  // Manejar submit del formulario
  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    subscriptionId: string,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTouchedFields({ frequency: true, startDate: true, endDate: true, status: true })
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }, t)
    setFormErrors(validation.errors)
    if (!validation.isValid) {
      setIsSubmitting(false)
      return
    }
    try {
      await updateSubscription(subscriptionId, {
        frequency: formData.frequency,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        status: formData.status as 'active' | 'inactive' | 'pending',
      })
      onSuccess(t('subscriptions.frequencyUpdated'))
      resetForm()
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

  return {
    subscriptions,
    installations,
    frequencyOptions,
    getMonthsByFrequency,
    loading,
    error,
    refreshSubscriptions,
    updateSubscription,
    // Nuevo para formulario
    formData,
    setFormData,
    formErrors,
    touchedFields,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    handleSubmitForm,
    resetForm,
  }
}

export default useSubscriptions 