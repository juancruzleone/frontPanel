import { useAuthStore } from '../../store/authStore'
import { getHeadersWithContentType } from '../utils/apiHeaders'
import { redirectToSafeUrl } from '../../utils/sanitizer'

const API_URL = import.meta.env.VITE_API_URL
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const SW_PATH = '/sw.js'
const PUSH_SYNC_KEY = 'push-subscription-synced-user'

const pushEndpoints = [
  'notificaciones/push/suscribir',
  'notificaciones/push/subscribe',
  'push/suscribir',
  'push/subscribe',
  'usuarios/push/suscripcion',
]

const toUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

class PushNotificationService {
  private registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

  private async getServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) {
      return null
    }

    if (!this.registrationPromise) {
      this.registrationPromise = navigator.serviceWorker.register(SW_PATH, {
        updateViaCache: 'none',
      })
        .then((registration) => registration)
        .catch(() => null)
    }

    return this.registrationPromise
  }

  private async subscribeUserToPush(registration: ServiceWorkerRegistration) {
    if (!('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      return null
    }

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  private async syncSubscriptionWithBackend(subscription: PushSubscription) {
    const { userId } = useAuthStore.getState()
    if (!userId) {
      return
    }

    const lastSyncedUser = localStorage.getItem(PUSH_SYNC_KEY)
    const endpoint = subscription.endpoint
    const syncCacheKey = `${userId}:${endpoint}`
    if (lastSyncedUser === syncCacheKey) {
      return
    }

    const body = {
      userId,
      subscription,
      endpoint,
      keys: subscription.toJSON().keys,
      platform: 'web',
      source: 'frontGMAO',
    }

    let synced = false
    for (const endpointPath of pushEndpoints) {
      try {
        const response = await fetch(`${API_URL}${endpointPath}`, {
          method: 'POST',
          headers: getHeadersWithContentType(),
          body: JSON.stringify(body),
        })
        if (response.ok) {
          synced = true
          break
        }
      } catch (error) {
        // Error al sincronizar suscripción push
      }
    }

    if (synced) {
      localStorage.setItem(PUSH_SYNC_KEY, syncCacheKey)
    }
  }

  async initialize() {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated || !('Notification' in window)) {
      return
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        return
      }
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const registration = await this.getServiceWorkerRegistration()
    if (!registration) {
      return
    }

    const subscription = await this.subscribeUserToPush(registration)
    if (!subscription) {
      return
    }

    await this.syncSubscriptionWithBackend(subscription)
  }

  showForegroundNotification(title: string, options: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return
    }

    try {
        const notification = new Notification(title, options)
        notification.onclick = () => {
          window.focus()
          if (options?.data?.url) {
            redirectToSafeUrl(String(options.data.url))
          }
        }
    } catch (error) {
      // Error al mostrar notificación en primer plano
    }
  }
}

export const pushNotificationService = new PushNotificationService()
