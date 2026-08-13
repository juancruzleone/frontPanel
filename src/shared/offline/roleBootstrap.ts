import { useAuthStore } from '@/store/authStore'
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { downloadPackage } from './packageDownload'

export async function prepareRoleOfflinePackage(): Promise<void> {
  const auth = useAuthStore.getState()
  const trust = useOfflineTrustStore.getState()
  if (!navigator.onLine || !trust.isOfflineReady || !auth.role) return
  if (!['cliente', 'admin'].includes(auth.role)) return
  await downloadPackage()
}
