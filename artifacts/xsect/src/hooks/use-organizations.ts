import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opportunityApi } from './use-opportunities';

export type Organization = { id: string; name: string; slug: string; logoUrl: string | null; description: string; industry: string | null; size: string | null; city: string | null; area: string | null; website: string | null; verificationState: string };
export type OrganizationOpportunity = { id: string; organizationId: string; type: string; title: string; description: string; skills: string[]; industry: string | null; workMode: string; city: string | null; area: string | null; intent: string; status: string; expiresAt: string | null };
export type OrganizationInput = Pick<Organization, 'name' | 'description' | 'industry' | 'size' | 'city' | 'area' | 'website' | 'logoUrl'>;
export type OrganizationDetail = { organization: Organization; members: Array<{ id: string; userId: string; organizationRole: 'owner' | 'admin' | 'member'; displayName: string | null; role: string }>; opportunities: OrganizationOpportunity[]; viewerRole: 'owner' | 'admin' | 'member' | null };

export function useOrganizations(filters: { q?: string; industry?: string; city?: string } = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, value!]));
  return useQuery<{ organizations: Organization[]; pagination: { total: number } }>({ queryKey: ['organizations', filters], queryFn: () => opportunityApi(`/organizations?${params}`) });
}
export function useMyOrganizations() {
  return useQuery<{ organizations: Array<{ organization: Organization; role: string }> }>({ queryKey: ['organizations', 'mine'], queryFn: () => opportunityApi('/organizations/mine') });
}
export function useOrganization(id?: string) {
  return useQuery<OrganizationDetail>({ queryKey: ['organizations', id], queryFn: () => opportunityApi(`/organizations/${id}`), enabled: !!id });
}
export function useOrganizationOpportunities(filters: { type?: string; industry?: string; city?: string } = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, value!]));
  return useQuery<{ opportunities: Array<{ opportunity: OrganizationOpportunity; organization: Organization; fit: { score: number; explanation: string[] } }> }>({ queryKey: ['organization-opportunities', filters], queryFn: () => opportunityApi(`/organization-opportunities?${params}`) });
}
export function useOrganizationActions(id?: string) {
  const client = useQueryClient();
  const invalidate = () => { client.invalidateQueries({ queryKey: ['organizations'] }); if (id) client.invalidateQueries({ queryKey: ['organizations', id] }); };
  const create = useMutation({ mutationFn: (input: OrganizationInput) => opportunityApi('/organizations', { method: 'POST', body: JSON.stringify(input) }), onSuccess: invalidate });
  const update = useMutation({ mutationFn: (input: Partial<OrganizationInput>) => opportunityApi(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(input) }), onSuccess: invalidate });
  const addMember = useMutation({ mutationFn: (input: { userId: string; role: 'admin' | 'member' }) => opportunityApi(`/organizations/${id}/members`, { method: 'POST', body: JSON.stringify(input) }), onSuccess: invalidate });
  const removeMember = useMutation({ mutationFn: (memberId: string) => opportunityApi(`/organizations/${id}/members/${memberId}`, { method: 'DELETE' }), onSuccess: invalidate });
  const createOpportunity = useMutation({ mutationFn: (input: Partial<OrganizationOpportunity>) => opportunityApi(`/organizations/${id}/opportunities`, { method: 'POST', body: JSON.stringify(input) }), onSuccess: invalidate });
  const updateOpportunity = useMutation({ mutationFn: ({ opportunityId, input }: { opportunityId: string; input: Partial<OrganizationOpportunity> }) => opportunityApi(`/organizations/${id}/opportunities/${opportunityId}`, { method: 'PATCH', body: JSON.stringify(input) }), onSuccess: invalidate });
  const removeOpportunity = useMutation({ mutationFn: (opportunityId: string) => opportunityApi(`/organizations/${id}/opportunities/${opportunityId}`, { method: 'DELETE' }), onSuccess: invalidate });
  return { create, update, addMember, removeMember, createOpportunity, updateOpportunity, removeOpportunity };
}