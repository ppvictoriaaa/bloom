import apiClient from './client'

interface RegisterData {
  email: string
  password: string
}

interface LoginData {
  email: string
  password: string
}

interface AuthResponse {
  accessToken: string
}

interface RegisterResponse {
  message: string
  userId: string
}

export const authApi = {
  register: (data: RegisterData) =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginData) =>
    apiClient.post<AuthResponse>('/auth/login', data),
}
