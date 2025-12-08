import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Componente que redirige automáticamente según el estado de autenticación:
 * - Si NO está logueado → Obtiene y redirige DIRECTAMENTE al PDF del último mantenimiento
 * - Si SÍ está logueado → Redirige al formulario interno
 * 
 * Esto permite que los QR funcionen para usuarios sin login mostrando directamente el PDF
 */
const FormularioRedirect = () => {
  const navigate = useNavigate()
  const { installationId, deviceId } = useParams()
  const { token } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleRedirect = async () => {
      if (!installationId || !deviceId) {
        navigate('/')
        return
      }

      // Si NO hay token → Usuario sin login → Obtener PDF del último mantenimiento
      if (!token) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
          console.log('🔍 Usuario sin login, obteniendo último mantenimiento...')
          console.log('📍 URL:', `${API_URL}/api/public/dispositivos/${installationId}/${deviceId}/ultimo-mantenimiento`)
          
          const response = await fetch(
            `${API_URL}/api/public/dispositivos/${installationId}/${deviceId}/ultimo-mantenimiento`
          )

          console.log('📡 Response status:', response.status)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Error del servidor:', errorData)
            throw new Error(errorData.error || errorData.message || 'No se encontró el último mantenimiento')
          }

          const data = await response.json()
          console.log('📦 Datos recibidos:', data)
          
          // Extraer pdfUrl de diferentes formatos posibles
          const pdfUrl = data.data?.pdfUrl || data.pdfUrl || data.data?.secure_url
          
          console.log('📄 PDF URL extraída:', pdfUrl)
          
          if (pdfUrl) {
            console.log('✅ Redirigiendo a PDF:', pdfUrl)
            // Redirigir DIRECTAMENTE al PDF (fuera de cmms.leonix.net.ar)
            window.location.href = pdfUrl
          } else {
            console.error('❌ No se encontró pdfUrl en la respuesta:', data)
            throw new Error('No hay PDF disponible para este dispositivo')
          }
        } catch (err: any) {
          console.error('❌ Error al obtener último mantenimiento:', err)
          setError(err.message || 'Error al cargar el mantenimiento')
        }
      } else {
        // Si hay token → Usuario logueado → Formulario protegido interno
        navigate(`/formulario-interno/${installationId}/${deviceId}`, { replace: true })
      }
    }

    handleRedirect()
  }, [token, installationId, deviceId, navigate])

  // Mostrar loader o error
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px'
          }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '10px' }}>Error</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{error}</p>
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>
          {!token ? 'Cargando último mantenimiento...' : 'Redirigiendo...'}
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
