export interface loginFormProps {
  username: string
  password: string
  errors: Record<string, string>
  showPassword: boolean
  handleUsernameChange: (value: string) => void
  handlePasswordChange: (value: string) => void
  togglePasswordVisibility: () => void
  handleSubmit: (e: React.FormEvent) => void
}
