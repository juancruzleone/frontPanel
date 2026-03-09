/**
 * Servicio de almacenamiento seguro
 * 
 * Proporciona una capa de abstracción sobre localStorage
 * con validación y sanitización de datos
 */

import { isValidJWT } from '../utils/sanitizer'

interface StorageOptions {
  encrypt?: boolean
  expiresIn?: number // milisegundos
}

interface StoredItem<T> {
  value: T
  timestamp: number
  expiresAt?: number
}

class SecureStorage {
  private prefix = 'leonix_'
  
  /**
   * Guarda un item en localStorage de forma segura
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const item: StoredItem<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      }
      
      const serialized = JSON.stringify(item)
      localStorage.setItem(this.prefix + key, serialized)
      return true
    } catch (error) {
      console.error('Error saving to secure storage:', error)
      return false
    }
  }
  
  /**
   * Obtiene un item de localStorage
   */
  get<T>(key: string): T | null {
    try {
      const serialized = localStorage.getItem(this.prefix + key)
      if (!serialized) return null
      
      const item: StoredItem<T> = JSON.parse(serialized)
      
      // Verificar expiración
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key)
        return null
      }
      
      return item.value
    } catch (error) {
      console.error('Error reading from secure storage:', error)
      return null
    }
  }
  
  /**
   * Remueve un item de localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error('Error removing from secure storage:', error)
    }
  }
  
  /**
   * Limpia todos los items del storage
   */
  clear(): void {
    try {
      // Obtener todas las claves antes de iterar
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key)
        }
      }
      
      // Remover las claves
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error('Error clearing secure storage:', error)
    }
  }
  
  /**
   * Verifica si un item existe y no ha expirado
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  /**
   * Guarda un token JWT de forma segura
   */
  setToken(token: string, expiresIn?: number): boolean {
    if (!isValidJWT(token)) {
      console.error('Invalid JWT token format')
      return false
    }
    
    return this.set('auth_token', token, { expiresIn })
  }
  
  /**
   * Obtiene el token JWT
   */
  getToken(): string | null {
    return this.get<string>('auth_token')
  }
  
  /**
   * Remueve el token JWT
   */
  removeToken(): void {
    this.remove('auth_token')
  }
  
  /**
   * Limpia datos sensibles (tokens, sesiones, etc.)
   */
  clearSensitiveData(): void {
    const sensitiveKeys = ['auth_token', 'user_session', 'refresh_token']
    sensitiveKeys.forEach(key => this.remove(key))
  }
  
  /**
   * Obtiene el tamaño usado en localStorage
   */
  getStorageSize(): number {
    let size = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key)
          if (item) {
            size += item.length + key.length
          }
        }
      }
    } catch (error) {
      console.error('Error calculating storage size:', error)
    }
    return size
  }
  
  /**
   * Verifica si el storage está disponible
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Limpia items expirados
   */
  cleanExpired(): void {
    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          const serialized = localStorage.getItem(key)
          if (serialized) {
            try {
              const item: StoredItem<any> = JSON.parse(serialized)
              if (item.expiresAt && Date.now() > item.expiresAt) {
                keysToRemove.push(key)
              }
            } catch {
              // Item corrupto, removerlo
              keysToRemove.push(key)
            }
          }
        }
      }
      
      // Remover las claves expiradas
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error('Error cleaning expired items:', error)
    }
  }
}

// Exportar instancia singleton
export const secureStorage = new SecureStorage()

// Limpiar items expirados al cargar
if (typeof window !== 'undefined') {
  secureStorage.cleanExpired()
  
  // Limpiar items expirados cada hora
  setInterval(() => {
    secureStorage.cleanExpired()
  }, 60 * 60 * 1000)
}

export default secureStorage
