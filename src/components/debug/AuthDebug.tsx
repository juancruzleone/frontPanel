import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { getAuthHeaders } from '../../shared/utils/apiHeaders'

const AuthDebug: React.FC = () => {
  const { user, token, role, tenantId, isAuthenticated } = useAuthStore()
  
  const testAuth = async () => {
    console.log('=== TESTING AUTH ===')
    console.log('Auth Store State:', { user, token: token?.substring(0, 20) + '...', role, tenantId, isAuthenticated })
    console.log('Headers:', getAuthHeaders())
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}categorias-formularios`, {
        headers: getAuthHeaders(),
      })
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const data = await response.json()
        console.log('Response data:', data)
      } else {
        const error = await response.text()
        console.log('Error response:', error)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    }
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '10px', 
      border: '1px solid #ccc',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h4>Auth Debug</h4>
      <p><strong>User:</strong> {user || 'null'}</p>
      <p><strong>Token:</strong> {token ? token.substring(0, 20) + '...' : 'null'}</p>
      <p><strong>Role:</strong> {role || 'null'}</p>
      <p><strong>TenantId:</strong> {tenantId || 'null'}</p>
      <p><strong>Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
      <button onClick={testAuth} style={{ marginTop: '10px', padding: '5px 10px' }}>
        Test Auth
      </button>
    </div>
  )
}

export default AuthDebug
