import apiClient from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const aiApi = {
  chat: (message: string, history: ChatMessage[], gardenId?: string) =>
    apiClient.post<{ reply: string }>('/ai/chat', { message, history, gardenId }),
}
