import apiClient from './client'

export interface UserProfile {
  userId: string
  name: string
  avatarUrl: string
  gardenIds: string[]
  notificationPreferences: {
    emailNotifications: boolean
    pushNotifications: boolean
  }
  verifiedEmails: string[]
}

export interface GardenNotificationSettings {
  gardenId: string
  notificationEmail: string
  isEmailVerified: boolean
  daysBefore: number
  time: string
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

  sendVerification: (email: string) =>
    apiClient.post('/users/notifications/send-verification', { email }),

  verifyCode: (email: string, code: string) =>
    apiClient.post('/users/notifications/verify-code', { email, code }),

  getAllGardenSettings: () =>
    apiClient.get<GardenNotificationSettings[]>('/users/notifications/garden-settings'),

  getGardenSettings: (gardenId: string) =>
    apiClient.get<GardenNotificationSettings>(`/users/notifications/garden-settings/${gardenId}`),

  upsertGardenSettings: (
    gardenId: string,
    data: { notificationEmail: string; daysBefore: number; time: string },
  ) =>
    apiClient.patch<GardenNotificationSettings>(
      `/users/notifications/garden-settings/${gardenId}`,
      data,
    ),

  triggerTestReminder: (gardenId: string) =>
    apiClient.post<{ sent: boolean; eventsCount: number; previewUrl: string | null; targetDate: string }>(
      `/users/notifications/trigger-test/${gardenId}`,
    ),
}
