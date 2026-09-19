import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Profile = {
  userId: string; displayName: string; role: string; intent: string; photoUrl: string | null;
  company: string | null; industry: string | null; city: string | null; area: string | null; identity: Record<string, string>;
  experience: Array<{ title: string; company: string; startYear?: number; endYear?: number; description?: string }>;
  links: Array<{ label: string; url: string }>; skills: string[]; wants: string[]; offers: string[];
  opportunityCategories: string[]; availability: string; urgency: string; discoveryRadius: number;
  notificationPreferences: { email: boolean; push: boolean; matches: boolean; messages: boolean };
  privacy: { trustedConnectionsOnly: boolean; womenOnly: boolean; stealthMode: boolean; visibilitySchedule?: { start: string; end: string; timezone?: string }; fieldVisibility: Record<string, boolean> };
  trustReputation: { score: number; completedConnections: number; endorsements: number }; onboardingComplete: boolean;
};
export const profileQueryKey = ['professional-profile'];
async function getProfile(): Promise<Profile | null> {
  const response = await fetch('/api/profile');
  if (!response.ok) throw new Error('Unable to load your profile.');
  return (await response.json()).profile;
}
export function useProfile(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: profileQueryKey,
    queryFn: getProfile,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const mutation = useMutation({
    mutationFn: async (profile: Partial<Profile>) => {
      const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to save your profile.');
      return (await response.json()).profile as Profile;
    },
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey, profile),
  });
  return { ...query, saveProfile: mutation.mutateAsync, saving: mutation.isPending, saveError: mutation.error };
}
export function useAreas() {
  return useQuery({ queryKey: ['areas'], staleTime: Infinity, queryFn: async () => {
    const res = await fetch('/api/areas', { credentials: 'include' });
    if (!res.ok) throw new Error('Unable to load areas');
    return res.json() as Promise<{ areas: Array<{ city: string; area: string }> }>;
  } });
}
