import apiClient from './client'

interface UserProfile {
  userId: string
  name: string
  avatarUrl: string
  gardenIds: string[]
  notificationPreferences: {
    emailNotifications: boolean
    pushNotifications: boolean
  }
}

interface UpdateProfileData {
  name?: string
  avatarUrl?: string
  notificationPreferences?: {
    emailNotifications?: boolean
    pushNotifications?: boolean
  }
}

export const usersApi = {
  getProfile: () =>
    apiClient.get<UserProfile>('/users/profile'),

  updateProfile: (data: UpdateProfileData) =>
    apiClient.patch<UserProfile>('/users/profile', data),
}
