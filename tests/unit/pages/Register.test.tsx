import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Register from '../../../src/pages/Register'
import { useRegister } from '../../../src/features/auth/register/hooks/useRegister'

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'es' },
    }),
  }
})

vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: vi.fn(() => true),
}))

vi.mock('../../../src/features/auth/register/hooks/useRegister', () => ({
  useRegister: vi.fn(),
}))


vi.mock('../../../src/shared/hooks/useResponsiveView', () => ({
  useResponsiveView: () => ['cards', vi.fn(), false],
}))

vi.mock('../../../src/shared/hooks/useTheme', () => ({
  useTheme: () => ({ dark: false }),
}))

vi.mock('../../../src/features/auth/register/components/ModalRegisterTechnician', () => ({
  default: () => null,
}))

vi.mock('../../../src/features/auth/register/components/ModalEditTechnician', () => ({
  default: () => null,
}))

vi.mock('../../../src/features/auth/register/components/ModalSuccess', () => ({
  default: () => null,
}))

vi.mock('../../../src/features/forms/components/ModalError', () => ({
  default: () => null,
}))

vi.mock('../../../src/features/installations/components/ModalConfirmDelete', () => ({
  default: () => null,
}))

describe('Register page', () => {
  beforeEach(() => {
    vi.mocked(useRegister).mockImplementation(() => {
      const [search, setSearch] = useState('')
      const allTechnicians = [
        { _id: '1', userName: 'Alpha', role: 'TECHNICIAN', createdAt: '2026-08-01T00:00:00.000Z' },
        { _id: '2', userName: 'Beta', role: 'TECHNICIAN', createdAt: '2026-08-02T00:00:00.000Z' },
      ]
      const filtered = allTechnicians.filter(t => !search || t.userName.toLowerCase().includes(search.toLowerCase()))
      return {
        showModal: false,
        responseMessage: '',
        isError: false,
        closeModal: vi.fn(),
        technicians: filtered,
        loadingTechnicians: false,
        fetchTechnicians: vi.fn(),
        addTechnician: vi.fn(),
        showSuccess: vi.fn(),
        showError: vi.fn(),
        search,
        setSearch,
        pagination: { page: 1, limit: 10, total: filtered.length, totalPages: 1 },
        setPage: vi.fn(),
        error: null,
      } as any
    })
  })

  it('retains the entered search text while filtering technicians', async () => {
    const user = userEvent.setup()
    render(<Register />)

    const searchInput = screen.getByPlaceholderText('personal.searchPlaceholder')
    await user.type(searchInput, 'alp')

    expect(searchInput).toHaveValue('alp')
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })
})
