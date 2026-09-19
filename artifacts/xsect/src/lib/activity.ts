import { useEffect, useState } from 'react';

export type ConnectionStatus = 'incoming' | 'outgoing' | 'accepted' | 'declined' | 'blocked';

export interface ActivityConnection {
  id: string;
  name: string;
  role: string;
  intent: string;
  status: ConnectionStatus;
  revealed: boolean;
  updatedAt: string;
}

export interface ActivityMessage {
  id: string;
  connectionId: string;
  from: 'self' | 'them';
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ActivityEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  attendees: number;
  matchedAttendees: number;
  description: string;
  host: string;
  rsvp: 'open' | 'requested' | 'confirmed' | 'waitlist' | 'cancelled';
}

export interface ActivityNotification {
  id: string;
  type: 'connection' | 'message' | 'event' | 'system';
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface ActivitySnapshot {
  connections: ActivityConnection[];
  messages: ActivityMessage[];
  events: ActivityEvent[];
  notifications: ActivityNotification[];
}

const seedEvents: ActivityEvent[] = [
  {
    id: 'evt_1',
    title: 'Systems & Climate Salon',
    date: 'Thursday, 6:00 PM',
    location: 'Private Gallery, Pacific Heights',
    image: '/images/event-1.jpg',
    attendees: 24,
    matchedAttendees: 7,
    description: 'A curated evening for operators and researchers building resilient systems. Heavy overlap with your core intent areas.',
    host: 'Protected Professional #842',
    rsvp: 'open',
  },
  {
    id: 'evt_2',
    title: 'Founders Breakfast: Hard Tech',
    date: 'Next Tuesday, 8:30 AM',
    location: 'Members Club, FiDi',
    image: '/images/event-2.jpg',
    attendees: 12,
    matchedAttendees: 4,
    description: 'An intimate breakfast discussion focused on hardware and deep-tech commercialization.',
    host: 'Trusted Node (Alex M.)',
    rsvp: 'waitlist',
  },
];

const seed: ActivitySnapshot = {
  connections: [
    {
      id: 'conn_1',
      name: 'Alex Rivera',
      role: 'Staff Product Designer',
      intent: 'Looking for a senior IC role at a Series C+ company',
      status: 'accepted',
      revealed: true,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'conn_2',
      name: 'Protected Professional',
      role: 'Senior Software Engineer',
      intent: 'Exploring AI infrastructure opportunities',
      status: 'incoming',
      revealed: false,
      updatedAt: new Date().toISOString(),
    },
  ],
  messages: [
    {
      id: 'msg_1',
      connectionId: 'conn_1',
      from: 'them',
      text: "Hi! Saw your intent regarding Series C roles. I'm actually leaving my current spot and they are looking for a strong IC to take over design systems.",
      createdAt: '10:42 AM',
      read: true,
    },
    {
      id: 'msg_2',
      connectionId: 'conn_1',
      from: 'self',
      text: 'Oh nice, thanks for reaching out. What stage is the systems work in right now?',
      createdAt: '11:05 AM',
      read: true,
    },
  ],
  events: seedEvents,
  notifications: [
    {
      id: 'note_1',
      type: 'connection',
      title: 'A protected signal requested a connection',
      description: 'Review the request and choose whether to reveal your identity.',
      createdAt: 'Just now',
      read: false,
      href: '/network',
    },
    {
      id: 'note_2',
      type: 'event',
      title: 'A curated event fits your orbit',
      description: 'Systems & Climate Salon has 7 matched attendees.',
      createdAt: 'Yesterday',
      read: false,
      href: '/events',
    },
  ],
};

const cache = new Map<string, ActivitySnapshot>();
const listeners = new Set<() => void>();
const eventName = 'xsect:activity-changed';

function storageKey(userId: string) {
  return `xsect:activity:${userId}`;
}

function cloneSeed(): ActivitySnapshot {
  return JSON.parse(JSON.stringify(seed)) as ActivitySnapshot;
}

function read(userId: string): ActivitySnapshot {
  if (cache.has(userId)) return cache.get(userId)!;
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    const snapshot = stored ? JSON.parse(stored) as ActivitySnapshot : cloneSeed();
    cache.set(userId, snapshot);
    return snapshot;
  } catch {
    const snapshot = cloneSeed();
    cache.set(userId, snapshot);
    return snapshot;
  }
}

function write(userId: string, snapshot: ActivitySnapshot) {
  cache.set(userId, snapshot);
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
  } catch {
    // The app still works in private browsing where storage can be unavailable.
  }
  window.dispatchEvent(new Event(eventName));
  listeners.forEach((listener) => listener());
}

export function useActivity(userId: string | undefined) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const onChange = () => forceRender((value) => value + 1);
    listeners.add(onChange);
    window.addEventListener(eventName, onChange);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener(eventName, onChange);
    };
  }, []);

  if (!userId) {
    return {
      snapshot: cloneSeed(),
      requestConnection: () => undefined,
      acceptConnection: () => undefined,
      declineConnection: () => undefined,
      blockConnection: () => undefined,
      sendMessage: () => undefined,
      markMessagesRead: () => undefined,
      updateEventRsvp: () => undefined,
      markNotificationRead: () => undefined,
      markAllNotificationsRead: () => undefined,
    };
  }

  const snapshot = read(userId);
  const update = (transform: (current: ActivitySnapshot) => ActivitySnapshot) => {
    write(userId, transform(read(userId)));
  };

  return {
    snapshot,
    requestConnection: (id: string) => update((current) => ({
      ...current,
      connections: current.connections.map((connection) =>
        connection.id === id ? { ...connection, status: 'outgoing', updatedAt: new Date().toISOString() } : connection,
      ),
      notifications: [{
        id: `note_${Date.now()}`,
        type: 'system',
        title: 'Connection request sent',
        description: 'Your identity remains protected until the other person accepts.',
        createdAt: 'Just now',
        read: false,
        href: '/network',
      }, ...current.notifications],
    })),
    acceptConnection: (id: string) => update((current) => ({
      ...current,
      connections: current.connections.map((connection) =>
        connection.id === id ? { ...connection, status: 'accepted', revealed: true, name: 'Jordan Lee', role: 'Senior Software Engineer', updatedAt: new Date().toISOString() } : connection,
      ),
      notifications: [{
        id: `note_${Date.now()}`,
        type: 'connection',
        title: 'Connection accepted',
        description: 'Identity is now revealed. You can start a private conversation.',
        createdAt: 'Just now',
        read: false,
        href: '/messages?thread=' + id,
      }, ...current.notifications],
    })),
    declineConnection: (id: string) => update((current) => ({
      ...current,
      connections: current.connections.map((connection) =>
        connection.id === id ? { ...connection, status: 'declined', updatedAt: new Date().toISOString() } : connection,
      ),
    })),
    blockConnection: (id: string) => update((current) => ({
      ...current,
      connections: current.connections.map((connection) =>
        connection.id === id ? { ...connection, status: 'blocked', updatedAt: new Date().toISOString() } : connection,
      ),
    })),
    sendMessage: (connectionId: string, text: string) => update((current) => ({
      ...current,
      messages: [...current.messages, {
        id: `msg_${Date.now()}`,
        connectionId,
        from: 'self',
        text,
        createdAt: 'Just now',
        read: true,
      }],
    })),
    markMessagesRead: (connectionId: string) => update((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.connectionId === connectionId ? { ...message, read: true } : message,
      ),
    })),
    updateEventRsvp: (id: string, rsvp: ActivityEvent['rsvp']) => update((current) => ({
      ...current,
      events: current.events.map((event) => event.id === id ? { ...event, rsvp } : event),
      notifications: [{
        id: `note_${Date.now()}`,
        type: 'event',
        title: rsvp === 'cancelled' ? 'RSVP cancelled' : rsvp === 'waitlist' ? 'Added to the event waitlist' : 'Event request received',
        description: 'We will update you if the event status changes.',
        createdAt: 'Just now',
        read: false,
        href: '/events',
      }, ...current.notifications],
    })),
    markNotificationRead: (id: string) => update((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => notification.id === id ? { ...notification, read: true } : notification),
    })),
    markAllNotificationsRead: () => update((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
    })),
  };
}