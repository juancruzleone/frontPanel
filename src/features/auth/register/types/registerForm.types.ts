export interface RegisterFormProps {
    username: string
    password: string
    confirmPassword: string
    errors: Record<string, string>
    showPassword: boolean
    showConfirmPassword: boolean
    handleUsernameChange: (value: string) => void
    handlePasswordChange: (value: string) => void
    handleConfirmPasswordChange: (value: string) => void
    togglePasswordVisibility: () => void
    toggleConfirmPasswordVisibility: () => void
    handleSubmit: (e: React.FormEvent) => void
    isSubmitting: boolean
  }