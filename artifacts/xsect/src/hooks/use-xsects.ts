import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Factor = { id: string; factor: string; score: number; weight: number; detail: string };
export type ProtectedProfile = {
  userId: string; revealed: boolean; displayName: string | null; photoUrl: string | null; role: string;
  industry: string | null; company: string | null; city: string | null; area: string | null;
  trustLevel: string; skills: string[]; intentSummary: string; lastActiveBand: string; handle: string;
};
export type Xsect = {
  id: string; type: string; score: number; explanation: string[]; reasons?: string[]; status: string; isHot: boolean;
  distanceBand: string | null; createdAt: string; updatedAt: string; factors: Factor[]; counterpart: ProtectedProfile | null;
};
export type Moment = { id: string; kind: string; title: string; body: string; readAt: string | null; createdAt: string; metadata: Record<string, unknown> };
export type Missed = { id: string; xsectId: string | null; score: number; status: string; distanceBand: string; occurredAt: string; area: string | null; city: string | null; counterpart: ProtectedProfile | null };

export class ApiError extends Error {
  constructor(message: string, public status: number, public payload?: Record<string, unknown>) { super(message); }
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(String(payload.error ?? response.statusText), response.status, payload);
  return payload as T;
}
const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
};

export function useRadar() {
  return useQuery<{ moments: Moment[]; hotXsects: Xsect[]; nearby: Record<string, Xsect[]>; stats: { activeXsects: number; missedThisWeek: number; connections: number } }>({
    queryKey: ['xsects', 'radar'], queryFn: () => api('/radar'), staleTime: 60_000,
  });
}
export function useXsects(filters: { type?: string; status?: string; minScore?: number } = {}) {
  return useQuery<{ xsects: Xsect[]; limited: boolean; plan: string }>({ queryKey: ['xsects', 'list', filters], queryFn: () => api(`/xsects?${query(filters)}`) });
}
export function useDiscover(filters: { category?: string; industry?: string; type?: string; minScore?: number }) {
  return useQuery<{ xsects: Xsect[] }>({ queryKey: ['xsects', 'discover', filters], queryFn: () => api(`/discover?${query(filters)}`) });
}
export function useMissed(status?: string) {
  return useQuery<{ missed: Missed[]; limited: boolean; plan: string }>({ queryKey: ['xsects', 'missed', status], queryFn: () => api(`/missed?${query({ status })}`) });
}
export function useMoments() {
  return useQuery<{ moments: Moment[]; nextCursor: string | null }>({ queryKey: ['xsects', 'moments'], queryFn: () => api('/moments') });
}
function xsectMutation(action: 'request' | 'dismiss') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/xsects/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['xsects'] }),
  });
}
export const useRequestXsect = () => xsectMutation('request');
export const useDismissXsect = () => xsectMutation('dismiss');
export function useMissedAction(action: 'request' | 'dismiss') {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api(`/missed/${id}/${action}`, { method: 'POST' }), onSuccess: () => client.invalidateQueries({ queryKey: ['xsects'] }) });
}