import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: Record<string, unknown>) { super(message); }
}
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/ai${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new ApiError(typeof body.error === 'string' ? body.error : response.statusText, response.status, body);
  return body as T;
}

export type Citation = { kind: 'xsect'|'path'|'event'|'missed'|'opportunity'|'alert'; id: string; reason: string };
export type AiQuery = { id:string; prompt:string; answer:string; citations:Citation[]; suggestedActions?:Array<{label:string;href:string}>; createdAt:string };
export type Quota = { plan:string; used?:number; dailyLimit:number|null };
export type TwinSummary = { whatYouOffer:string[];whatYouWant:string[];whatYouAreGoodAt:string[];whoYouShouldMeet:string[];opportunitiesThatFit:string[];industries:string[];networkingGoals:string[] };
export type ProfessionalTwin = { generated:TwinSummary;overrides:Partial<TwinSummary>;merged:TwinSummary;model:string;generatedAt:string };
export type Agent = { id:string;rawIntent:string;structured:{role:string|null;companyStage:string|null;industry:string|null;location:string|null;availability:string|null;keywords:string[];wantCategories:string[];offerCategories:string[]};status:'active'|'paused'|'archived';lastRunAt:string|null;findingCount:number };
export type Finding = { id:string;score:number;reason:string;seenAt:string|null;xsectId:string|null;target:{revealed:boolean;displayName:string|null;handle:string;role:string;intentSummary:string}|null;opportunity:{id:string;title:string;type:string;description:string;organization:{id:string;name:string}|null}|null };

export function useAiHistory(){ return useQuery<{history:AiQuery[];quota:Quota}>({queryKey:['ai','history'],queryFn:()=>json('/history')}); }
export function useAskIntelligence(){ const qc=useQueryClient(); return useMutation({mutationFn:(prompt:string)=>json<{query:AiQuery;quota:Quota}>('/query',{method:'POST',body:JSON.stringify({prompt})}),onSuccess:()=>qc.invalidateQueries({queryKey:['ai','history']})}); }
export function useTwin(){ return useQuery<{twin:ProfessionalTwin|null}>({queryKey:['ai','twin'],queryFn:()=>json('/twin')}); }
export function useRegenerateTwin(){ const qc=useQueryClient(); return useMutation({mutationFn:()=>json<{twin:ProfessionalTwin}>('/twin/regenerate',{method:'POST'}),onSuccess:data=>qc.setQueryData(['ai','twin'],data)}); }
export function useUpdateTwin(){ const qc=useQueryClient(); return useMutation({mutationFn:(patch:Partial<TwinSummary>)=>json<{twin:ProfessionalTwin}>('/twin',{method:'PATCH',body:JSON.stringify(patch)}),onSuccess:data=>qc.setQueryData(['ai','twin'],data)}); }
export function useAgents(){ return useQuery<{agents:Agent[];entitlement:boolean;plan:string}>({queryKey:['ai','agents'],queryFn:()=>json('/agents')}); }
export function useCreateAgent(){ const qc=useQueryClient(); return useMutation({mutationFn:(rawIntent:string)=>json<{agent:Agent}>('/agents',{method:'POST',body:JSON.stringify({rawIntent})}),onSuccess:()=>qc.invalidateQueries({queryKey:['ai','agents']})}); }
export function useRunAgent(){ const qc=useQueryClient(); return useMutation({mutationFn:(id:string)=>json(`/agents/${id}/run`,{method:'POST'}),onSuccess:(_,id)=>{qc.invalidateQueries({queryKey:['ai','agents']});qc.invalidateQueries({queryKey:['ai','findings',id]});}}); }
export function useUpdateAgent(){ const qc=useQueryClient(); return useMutation({mutationFn:({id,status}:{id:string;status:Agent['status']})=>json(`/agents/${id}`,{method:'PATCH',body:JSON.stringify({status})}),onSuccess:()=>qc.invalidateQueries({queryKey:['ai','agents']})}); }
export function useAgentFindings(id?:string){ return useQuery<{findings:Finding[]}>({queryKey:['ai','findings',id],queryFn:()=>json(`/agents/${id}/findings`),enabled:!!id}); }
export function useSeenFinding(){ const qc=useQueryClient(); return useMutation({mutationFn:({agentId,findingId}:{agentId:string;findingId:string})=>json(`/agents/${agentId}/findings/${findingId}/seen`,{method:'POST'}),onSuccess:(_,v)=>qc.invalidateQueries({queryKey:['ai','findings',v.agentId]})}); }