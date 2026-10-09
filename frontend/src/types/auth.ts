export type UserRole = 'user' | 'admin'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export interface UpdateProfileInput {
  name: string
  email: string
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
