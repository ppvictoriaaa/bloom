import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users'

export function useProfile() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.getProfile().then((r) => r.data),
  })

  return { profile, isLoading }
}