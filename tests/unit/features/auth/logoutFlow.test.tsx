import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runExplicitLogout } from '../../../../src/features/auth/services/explicitLogout'
import Login from '../../../../src/pages/Login'
import { useAuthStore } from '../../../../src/store/authStore'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => ({
        'auth.continue': 'Continuar',
        'auth.logoutSuccess': 'Sesión cerrada exitosamente',
        'auth.successTitle': 'Éxito',
        'login.titlePage': 'Login',
      })[key] ?? key,
      i18n: { language: 'es' },
    }),
  }
})

vi.mock('../../../../src/features/auth/components/LoginForm', () => ({
  default: () => <div>Login form</div>,
}))

vi.mock('../../../../src/features/auth/hooks/useLogin', () => ({
  useLogin: () => ({
    username: '',
    password: '',
    errors: {},
    showPassword: false,
    handleUsernameChange: vi.fn(),
    handlePasswordChange: vi.fn(),
    togglePasswordVisibility: vi.fn(),
    handleSubmit: vi.fn(),
    showModal: false,
    responseMessage: '',
    isError: false,
    closeModal: vi.fn(),
  }),
}))

describe('explicit logout notification flow', () => {
  beforeEach(() => {
    useAuthStore.setState({
      logoutMessage: null,
      user: null,
      userId: null,
      tenantId: null,
      isAuthenticated: false,
      isAuthResolved: true,
      accessMode: 'anonymous',
    })
  })

  it('publishes success only after the durable local logout finishes', async () => {
    let finishLogout: (() => void) | undefined
    const logout = vi.fn(() => new Promise<void>((resolve) => {
      finishLogout = resolve
    }))
    const setLogoutMessage = vi.fn()
    const navigate = vi.fn()

    const result = runExplicitLogout({
      csrfToken: 'csrf-token',
      logoutSession: vi.fn().mockResolvedValue(undefined),
      logout,
      setLogoutMessage,
      navigate,
    })

    await Promise.resolve()
    expect(setLogoutMessage).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()

    finishLogout?.()
    await result

    expect(setLogoutMessage).toHaveBeenCalledWith('auth.logoutSuccess')
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('shows the success modal for an explicit logout notification', async () => {
    useAuthStore.getState().setLogoutMessage('auth.logoutSuccess')

    render(<MemoryRouter initialEntries={['/']}><Login /></MemoryRouter>)

    expect(await screen.findByText('Sesión cerrada exitosamente')).toBeInTheDocument()
    expect(useAuthStore.getState().logoutMessage).toBeNull()
  })

  it('does not show the success modal for unrelated session termination', async () => {
    await act(async () => {
      await useAuthStore.getState().logout()
    })

    render(<MemoryRouter initialEntries={['/']}><Login /></MemoryRouter>)

    expect(screen.queryByText('Sesión cerrada exitosamente')).not.toBeInTheDocument()
  })
})
