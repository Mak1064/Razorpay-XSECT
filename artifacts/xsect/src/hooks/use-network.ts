import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export class NetworkApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    super(typeof data.error === 'string' ? data.error : 'Network request failed.');
    this.status = status;
    this.data = data;
  }
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new NetworkApiError(response.status, data as Record<string, unknown>);
  return data as T;
}
export type PathStep = { userId: string; label: string; relationshipStrength: number; trust: string; revealed: boolean };
export type XsectPath = { id: string; query: string; targetUserId: string | null; steps: PathStep[]; stepCount: number; strength: number; relevance: number; trust: string; explanation: string; createdAt: string };
export function usePathSearch(query: string) {
  return useQuery<{ paths: XsectPath[]; plan: string; maxHops: number }>({ queryKey: ['network', 'paths', query], queryFn: () => api(`/paths?q=${encodeURIComponent(query)}`), enabled: query.trim().length >= 2 });
}
export function usePathHistory() {
  return useQuery<{ paths: XsectPath[] }>({ queryKey: ['network', 'paths', 'history'], queryFn: () => api('/paths/history') });
}
export function useRequestBridge() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (value: { intermediaryId: string; targetUserId: string; reason: string; pathId?: string; xsectId?: string }) => api('/introductions', { method: 'POST', body: JSON.stringify(value) }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'introductions'] }) });
}
export type Introduction = { id: string; requesterId: string; intermediaryId: string; targetUserId: string; reason: string; status: string; createdAt: string; expiresAt?: string | null };
export function useIntroductions() {
  return useQuery<{ inbox: Introduction[]; sent: Introduction[]; received: Introduction[] }>({ queryKey: ['network', 'introductions'], queryFn: () => api('/introductions') });
}
function introductionAction(action: 'accept' | 'decline' | 'complete') {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/introductions/${id}/${action}`, { method: 'POST' }), onSuccess: () => { client.invalidateQueries({ queryKey: ['network', 'introductions'] }); client.invalidateQueries({ queryKey: ['social', 'connections'] }); } });
}
export const useAcceptIntroduction = () => introductionAction('accept');
export const useDeclineIntroduction = () => introductionAction('decline');
export const useCompleteIntroduction = () => introductionAction('complete');

export type AlertCriteria = { keywords: string[]; skills: string[]; industries: string[]; wantCategories: string[]; offerCategories: string[]; minScore: number };
export type StandingAlert = { id: string; title: string; criteria: AlertCriteria; radiusKm: number; trustRequirement: string; frequency: string; status: string; expiresAt?: string | null; triggerCount: number; lastTriggeredAt?: string | null };
export type AlertInput = Omit<StandingAlert, 'id' | 'status' | 'triggerCount' | 'lastTriggeredAt'>;
export function useAlerts() { return useQuery<{ alerts: StandingAlert[] }>({ queryKey: ['network', 'alerts'], queryFn: () => api('/alerts') }); }
export function useCreateAlert() { const client = useQueryClient(); return useMutation({ mutationFn: (input: AlertInput) => api('/alerts', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'alerts'] }) }); }
export function useUpdateAlert() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<AlertInput> }) => api(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'alerts'] }) }); }
export function useDeleteAlert() { const client = useQueryClient(); return useMutation({ mutationFn: (id: string) => api(`/alerts/${id}`, { method: 'DELETE' }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'alerts'] }) }); }
export function useAlertStatus(action: 'pause' | 'resume') { const client = useQueryClient(); return useMutation({ mutationFn: (id: string) => api(`/alerts/${id}/${action}`, { method: 'POST' }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'alerts'] }) }); }
export function useRunAlert() { const client = useQueryClient(); return useMutation({ mutationFn: (id: string) => api<{ evaluated: number; triggered: number }>(`/alerts/${id}/run-now`, { method: 'POST' }), onSuccess: (_, id) => { client.invalidateQueries({ queryKey: ['network', 'alerts'] }); client.invalidateQueries({ queryKey: ['network', 'alert-triggers', id] }); } }); }
export type ProtectedView = { userId: string; revealed: boolean; displayName: string | null; role: string; industry: string | null; area: string | null; trustLevel: string; handle: string };
export function useAlertTriggers(id?: string) { return useQuery<{ triggers: Array<{ id: string; score: number; explanation: string[]; counterpart: ProtectedView }> }>({ queryKey: ['network', 'alert-triggers', id], queryFn: () => api(`/alerts/${id}/triggers`), enabled: !!id }); }

export type ReviewInput = { connectionId: string; rating: number; professionalism: number; reliability: number; helpfulness: number; comment: string };
export type Review = ReviewInput & { id: string; reviewerId: string; revieweeId: string; createdAt: string };
export function useMyReviews() { return useQuery<{ received: Review[]; aggregate: { score: number; count: number; average: number; completedConnections: number; endorsements: number } }>({ queryKey: ['network', 'reviews', 'me'], queryFn: () => api('/reviews/me') }); }
export function useCreateReview() { const client = useQueryClient(); return useMutation({ mutationFn: (input: ReviewInput) => api('/reviews', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => client.invalidateQueries({ queryKey: ['network', 'reviews'] }) }); }
export function useReputation() { return useQuery<{ events: Array<{ id: string; kind: string; delta: number; createdAt: string }>; total: number; byKind: Record<string, number> }>({ queryKey: ['network', 'reputation'], queryFn: () => api('/reputation/me') }); }

export type MapCluster = { city: string; area: string; centroid: { lat: number; lng: number }; wantsByCategory: Record<string, number>; offersByCategory: Record<string, number>; organizationOpportunitiesByType: Record<string, number>; activeUsers: number; hotXsects: number; gaps: Array<{ category: string; demand: number; supply: number; gap: number }> };
export function useOpportunityMap(city = '') { return useQuery<{ clusters: MapCluster[] }>({ queryKey: ['network', 'map', city], queryFn: () => api(`/map/clusters${city ? `?city=${encodeURIComponent(city)}` : ''}`), retry: false }); }
export function useEventXsects(eventId?: string, enabled = true) { return useQuery<{ xsects: Array<{ xsectId: string; score: number; explanation: string[]; counterpart: ProtectedView }>; count: number }>({ queryKey: ['network', 'event-xsects', eventId], queryFn: () => api(`/events/${eventId}/who-to-meet`), enabled: !!eventId && enabled, retry: false }); }