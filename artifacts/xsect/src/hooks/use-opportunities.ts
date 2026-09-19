import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type IntentKind = 'wants' | 'offers';
export type IntentStatus = 'active' | 'paused' | 'fulfilled' | 'expired';
export type OpportunityIntent = {
  id: string; title: string; description: string; category: string; skills: string[]; industry: string | null;
  locationPreference: string | null; radiusKm: number; intent: 'casual' | 'active' | 'urgent';
  availability: string; workMode: 'remote' | 'hybrid' | 'in_person' | 'flexible';
  visibility: 'discoverable' | 'trusted_only' | 'hidden'; trustRequirement: 'contact' | 'professional' | 'enhanced';
  status: IntentStatus; expiresAt: string | null; createdAt: string;
};
export type IntentInput = Omit<OpportunityIntent, 'id' | 'status' | 'createdAt'>;
export type AvailabilityRule = { id?: string; mode: 'recurring' | 'one_off'; weekday?: number | null; date?: string | null; startTime: string; endTime: string; timezone: string };
export type TrustProgress = { level: 'contact' | 'professional' | 'enhanced'; computedLevel?: 'contact' | 'professional' | 'enhanced'; missing: string[]; changed?: boolean; stats: { activeWantOrOfferCount: number; acceptedConnections: number; reviewsReceived: number; averageReviewRating: number; verifiedOrganizationMembership: boolean } };

export async function opportunityApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || response.statusText); }
  return response.status === 204 ? null as T : response.json();
}
export function useIntents(kind: IntentKind) {
  return useQuery<{ wants?: OpportunityIntent[]; offers?: OpportunityIntent[] }>({ queryKey: ['opportunities', kind], queryFn: () => opportunityApi(`/${kind}`) });
}
export function useIntentActions(kind: IntentKind) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['opportunities', kind] });
  const create = useMutation({ mutationFn: (input: IntentInput) => opportunityApi(`/${kind}`, { method: 'POST', body: JSON.stringify(input) }), onSuccess: refresh });
  const update = useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<IntentInput> }) => opportunityApi(`/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(input) }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => opportunityApi(`/${kind}/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const status = useMutation({ mutationFn: ({ id, status }: { id: string; status: 'active' | 'paused' | 'fulfilled' }) => opportunityApi(`/${kind}/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }), onSuccess: refresh });
  return { create, update, remove, status };
}
export function useAvailability() {
  const client = useQueryClient();
  const query = useQuery<{ rules: AvailabilityRule[] }>({ queryKey: ['availability'], queryFn: () => opportunityApi('/availability') });
  const save = useMutation({ mutationFn: (rules: AvailabilityRule[]) => opportunityApi<{ rules: AvailabilityRule[] }>('/availability', { method: 'PUT', body: JSON.stringify({ rules }) }), onSuccess: (data) => client.setQueryData(['availability'], data) });
  return { ...query, save };
}
export function useTrust() {
  const client = useQueryClient();
  const query = useQuery<TrustProgress>({ queryKey: ['trust'], queryFn: () => opportunityApi('/trust/me') });
  const recompute = useMutation({ mutationFn: () => opportunityApi<TrustProgress>('/trust/recompute', { method: 'POST' }), onSuccess: (data) => client.setQueryData(['trust'], data) });
  return { ...query, recompute };
}