import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Plan = 'free' | 'pro' | 'pro_plus';
export type AdminMe = { isAdmin: boolean; plan: Plan; planSource: 'override' | 'free' };
export const adminMeQueryKey = ['admin-me'];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? response.statusText);
  }
  return response.status === 204 ? null as T : response.json();
}

export type AdminUser = {
  userId: string; displayName: string; role: string; city: string | null; area: string | null;
  trustLevel: string; visibility: string; lastActiveAt: string;
  counts: { wants: number; offers: number; xsects: number };
};
export type Overview = {
  counts: Record<string, number | { last24h: number; last7d: number; total: number }>;
  xsects: Array<{ type: string; status: string; value: number }>;
  planDistribution: Record<Plan, number>;
  topAreas: Array<{ city: string; area: string; crossings: number }>;
};
export type Funnel = {
  days: number;
  funnel: Array<{ name: string; label: string; count: number; conversion: number }>;
  daily: Array<{ date: string; xsect_created: number; request_sent: number }>;
};

export function useAdminMe() {
  return useQuery({ queryKey: adminMeQueryKey, queryFn: () => api<AdminMe>('/api/admin/me'), staleTime: 60_000 });
}
export function useIsAdmin() { return useAdminMe().data?.isAdmin ?? false; }
export function useAdminOverview(enabled = true) { return useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api<Overview>('/api/admin/overview'), enabled }); }
export function useAdminAreas(enabled = true) { return useQuery({ queryKey: ['admin', 'areas'], queryFn: () => api<{ areas: Array<{ city: string; area: string }> }>('/api/admin/areas'), enabled, staleTime: Infinity }); }
export function useAdminUsers(q = '', page = 1, enabled = true) {
  return useQuery({ queryKey: ['admin', 'users', q, page], queryFn: () => api<{ users: AdminUser[]; page: number; total: number; pages: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&page=${page}`), enabled });
}
export function useAdminUser(id?: string) {
  return useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api<Record<string, unknown>>(`/api/admin/users/${id}`), enabled: !!id });
}
export function useAdminFunnel(days = 30, enabled = true) {
  return useQuery({ queryKey: ['admin', 'funnel', days], queryFn: () => api<Funnel>(`/api/admin/analytics/funnel?days=${days}`), enabled });
}
export function useAdminEvents(days = 30, name = '', enabled = true) {
  return useQuery({ queryKey: ['admin', 'events', days, name], queryFn: () => api<{ events: Array<{ id: string; userId: string | null; name: string; properties: Record<string, unknown>; createdAt: string }> }>(`/api/admin/analytics/events?days=${days}&name=${encodeURIComponent(name)}`), enabled });
}
export function useAdminOverrides(enabled = true) {
  return useQuery({ queryKey: ['admin', 'overrides'], queryFn: () => api<{ overrides: Array<{ userId: string; displayName: string | null; role: string | null; plan: Plan; setBy: string; updatedAt: string }> }>('/api/admin/plan-overrides'), enabled });
}
export function useAdmins(enabled = true) {
  return useQuery({ queryKey: ['admin', 'admins'], queryFn: () => api<{ admins: Array<{ userId: string; displayName: string | null; role: string | null; grantedBy: string | null; createdAt: string }> }>('/api/admin/admins'), enabled });
}

export function useAdminAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: string; body?: unknown }) => api<any>(`/api${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}
export function useBootstrapAdmin() {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => api('/api/admin/bootstrap', { method: 'POST' }), onSuccess: () => client.invalidateQueries({ queryKey: adminMeQueryKey }) });
}