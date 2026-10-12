export type UserRole = 'user' | 'admin'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AdminUser extends PublicUser {
  createdAt: string
  updatedAt: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export interface UpdateProfileInput {
  name: string
  email: string
}

export interface UpdateAdminUserInput {
  name?: string
  email?: string
  role?: UserRole
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface DeleteAccountInput {
  password: string
}

export interface LoginResponse {
  user: PublicUser
  accessToken: string
}

export interface PublicConfig {
  passwordResetEnabled: boolean
}
