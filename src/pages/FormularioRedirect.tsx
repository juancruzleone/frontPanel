import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isClient } from '../shared/utils/roleUtils'
import { redirectToSafeUrl } from '../utils/sanitizer'

/**
 * Componente que redirige automáticamente según el estado de autenticación:
 * - Si NO está logueado → Obtiene y redirige DIRECTAMENTE al PDF del último mantenimiento
 * - Si está logueado como CLIENTE → Redirige al PDF del último mantenimiento
 * - Si está logueado como otro rol → Redirige al formulario interno
 * 
 * Esto permite que los QR funcionen para usuarios sin login mostrando directamente el PDF
 * y que los clientes también vean solo el último mantenimiento
 */
const FormularioRedirect = () => {
  const navigate = useNavigate()
  const { installationId, deviceId } = useParams()
  const { isAuthenticated, role } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleRedirect = async () => {
      if (!installationId || !deviceId) {
        navigate('/')
        return
      }

      // Función para obtener y redirigir al último mantenimiento
      const redirectToLastMaintenance = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || '/api/'



          const response = await fetch(
            `${API_URL}public/dispositivos/${installationId}/${deviceId}/ultimo-mantenimiento`
          )



          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || errorData.message || 'No se encontró el último mantenimiento')
          }

          const data = await response.json()


          // Extraer pdfUrl de diferentes formatos posibles
          const pdfUrl = data.data?.pdfUrl || data.pdfUrl || data.data?.secure_url



          if (pdfUrl && redirectToSafeUrl(pdfUrl)) {
            return
          } else {
            throw new Error('No hay PDF disponible para este dispositivo o la URL no es segura')
          }
        } catch (err: any) {
          setError(err.message || 'Error al cargar el mantenimiento')
        }
      }

      // Si NO hay token → Usuario sin login → Obtener PDF del último mantenimiento
      if (!isAuthenticated) {
        if (!navigator.onLine) {
          setError('Se requiere conexión a internet para ver el último mantenimiento o cargar el formulario por primera vez.')
          return
        }
        await redirectToLastMaintenance()
        return
      }

      // Si hay token Y el usuario es CLIENTE → También redirigir al último mantenimiento
      if (isClient(role)) {
        if (!navigator.onLine) {
          setError('Se requiere conexión a internet para ver el PDF del último mantenimiento.')
          return
        }
        await redirectToLastMaintenance()
        return
      }

      // Si hay token Y NO es cliente → Usuario logueado → Formulario protegido interno
      // En modo offline, si ya estamos logueados (cacheado), permitimos ir al formulario interno
      // que tiene su propia lógica de cache de campos.
      navigate(`/formulario-interno/${installationId}/${deviceId}`, { replace: true })
    }

    handleRedirect()
  }, [isAuthenticated, role, installationId, deviceId, navigate])

  // Mostrar loader o error
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--color-bg)',
        padding: '20px',
        color: 'var(--color-text)'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px'
          }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '10px' }}>Error</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--color-danger)' }}>{error}</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Este dispositivo aún no tiene mantenimientos registrados</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text)'
    }}>
      <div style={{
        textAlign: 'center'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid var(--color-card-border)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>
          {!isAuthenticated ? 'Cargando último mantenimiento...' : 'Redirigiendo...'}
        </p>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default FormularioRedirect
