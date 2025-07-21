import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchInstallations, updateInstallation } from '../../installations/services/installationServices'
import type { Installation } from '../../installations/hooks/useInstallations'

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
  startDate: Date
  endDate: Date
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
      startDate: installation.fechaInicio ? new Date(installation.fechaInicio) : new Date(),
      endDate: installation.fechaFin ? new Date(installation.fechaFin) : new Date(),
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
      setError(err.message || t('subscriptions.errorLoading'))
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

  // Función para actualizar abono (frecuencia, fechas, estado)
  const updateSubscription = async (subscriptionId: string, data: Partial<Subscription>) => {
    // Buscar la instalación original
    const installation = installations.find(inst => inst._id === subscriptionId)
    if (!installation) throw new Error(t('subscriptions.installationNotFound'))
    // Preparar datos a actualizar
    const updateData: any = {
      ...installation,
      frecuencia: data.frequency || installation.frecuencia,
      fechaInicio: data.startDate || installation.fechaInicio,
      fechaFin: data.endDate || installation.fechaFin,
      estado: data.status || installation.estado,
      mesesFrecuencia: data.months || installation.mesesFrecuencia || getMonthsByFrequency(data.frequency || installation.frecuencia || ''),
    }
    // Llamar al backend
    await updateInstallation(subscriptionId, updateData)
    // Refrescar datos
    await loadSubscriptions()
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
  }
}

export default useSubscriptions 