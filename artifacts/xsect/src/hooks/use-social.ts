import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api/social';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'omit', // or 'include' based on how auth works in this app, usually Clerk handles it via headers, but let's use include if it uses cookies. Wait, standard clerk uses Authorization header or cookies if same domain. We will just use standard fetch which might get intercepted or handled by service worker, but 'include' is safe for same-origin cookies.
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  
  // Return null for 204 No Content
  if (res.status === 204) return null as any;
  
  return res.json();
}

// ---------------------------------------------------------
// Connections
// ---------------------------------------------------------

export interface SocialConnection {
  id: string;
  userId: string;
  name?: string; 
  initials?: string; 
  role: string;
  intent: string;
  status: 'incoming' | 'outgoing' | 'accepted' | 'blocked';
}

export function useConnections() {
  return useQuery<SocialConnection[]>({
    queryKey: ['social', 'connections'],
    queryFn: () => fetchJson(`${API_BASE}/connections`),
  });
}

export function useRequestConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => fetchJson(`${API_BASE}/connections/${userId}/request`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'connections'] }),
  });
}

export function useAcceptConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`${API_BASE}/connections/${id}/accept`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'connections'] }),
  });
}

export function useDeclineConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`${API_BASE}/connections/${id}/decline`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'connections'] }),
  });
}

export function useWithdrawConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`${API_BASE}/connections/${id}/withdraw`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'connections'] }),
  });
}

export function useBlockConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`${API_BASE}/connections/${id}/block`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'connections'] }),
  });
}

// ---------------------------------------------------------
// Conversations & Messages
// ---------------------------------------------------------

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    role: string;
    initials: string;
  };
  lastMessage?: string;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['social', 'conversations'],
    queryFn: () => fetchJson(`${API_BASE}/conversations`),
  });
}

export function useConversationMessages(conversationId?: string) {
  return useQuery<Message[]>({
    queryKey: ['social', 'conversations', conversationId, 'messages'],
    queryFn: () => fetchJson(`${API_BASE}/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) => 
      fetchJson(`${API_BASE}/conversations/${conversationId}/messages`, { 
        method: 'POST',
        body: JSON.stringify({ content })
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['social', 'conversations', variables.conversationId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['social', 'conversations'] });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => fetchJson(`${API_BASE}/conversations/${conversationId}/read`, { method: 'POST' }),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ['social', 'conversations'] });
    },
  });
}

// ---------------------------------------------------------
// Events
// ---------------------------------------------------------

export interface SocialEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
  status: 'upcoming' | 'past';
  rsvpStatus: 'none' | 'requested' | 'confirmed' | 'waitlisted';
}

export function useEvents() {
  return useQuery<SocialEvent[]>({
    queryKey: ['social', 'events'],
    queryFn: () => fetchJson(`${API_BASE}/events`),
  });
}

export function useUpdateRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SocialEvent['rsvpStatus'] }) => 
      fetchJson(`${API_BASE}/events/${id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'events'] }),
  });
}

// ---------------------------------------------------------
// Notifications
// ---------------------------------------------------------

export interface Notification {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'event_invite' | 'message';
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['social', 'notifications'],
    queryFn: () => fetchJson(`${API_BASE}/notifications`),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`${API_BASE}/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson(`${API_BASE}/notifications/read-all`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'notifications'] }),
  });
}
