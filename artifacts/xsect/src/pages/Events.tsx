import { useState } from 'react';
import { Calendar as CalendarIcon, Check, Clock3, MapPin, ShieldCheck, Users, X, Plus, Flag, Sparkles, Pencil, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type EventRecord = {
  id: string; title: string; description: string; location: string; startsAt: string;
  capacity: string; createdBy?: string; cancelledAt?: string | null; attendeeCount?: number;
  intentTags?: string[]; womenOnly?: boolean; rsvp?: { status: string } | null; matching?: { status: string; reason?: string; score?: number; shared?: string[] };
};
type EventDetail = { event: EventRecord; rsvp: { status: string } | null; admins: { userId: string; role: string }[]; attendees: { id: string; label: string; status: string; relevance?: { status: string; score?: number; reason?: string } }[]; generations: { id: string; prompt: string; status: string; output?: string | null }[] };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  return response.json();
}

export default function EventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eventsQuery = useQuery<{ events: EventRecord[] }>({ queryKey: ['social', 'events'], queryFn: () => api('/api/social/events') });
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [form, setForm] = useState({ title: '', description: '', location: '', startsAt: '', capacity: '24', intentTags: '' });
  const events = eventsQuery.data?.events ?? [];
  const selected = events.find((event) => event.id === selectedId) ?? events[0];
  const detailQuery = useQuery<EventDetail>({ queryKey: ['social', 'events', selected?.id], queryFn: () => api(`/api/social/events/${selected.id}`), enabled: !!selected?.id });
  const detail = detailQuery.data;
  const create = useMutation({ mutationFn: () => api('/api/social/events', { method: 'POST', body: JSON.stringify({ ...form, capacity: Number(form.capacity), intentTags: form.intentTags.split(',').map((tag) => tag.trim()).filter(Boolean) }) }), onSuccess: () => { setShowCreate(false); setForm({ title: '', description: '', location: '', startsAt: '', capacity: '24', intentTags: '' }); queryClient.invalidateQueries({ queryKey: ['social', 'events'] }); } });
  const update = useMutation({ mutationFn: () => api(`/api/social/events/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, capacity: Number(form.capacity), intentTags: form.intentTags.split(',').map((tag) => tag.trim()).filter(Boolean) }) }), onSuccess: () => { setShowEdit(false); queryClient.invalidateQueries({ queryKey: ['social', 'events'] }); queryClient.invalidateQueries({ queryKey: ['social', 'events', selected.id] }); } });
  const rsvp = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/social/events/${id}/${status === 'cancelled' ? 'cancel' : 'rsvp'}`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social', 'events'] }),
  });

  const changeRsvp = (event: EventRecord, next: string) => {
    rsvp.mutate({ id: event.id, status: next });
    const title = next === 'cancelled' ? 'RSVP cancelled' : next === 'waitlist' ? 'Added to waitlist' : 'Invite requested';
    toast({ title, description: 'Your event status has been saved.' });
  };
  const openCreate = () => { setForm({ title: '', description: '', location: '', startsAt: '', capacity: '24', intentTags: '' }); setShowCreate(true); };
  const openEdit = () => { if (!selected) return; setForm({ title: selected.title, description: selected.description, location: selected.location, startsAt: selected.startsAt.slice(0, 16), capacity: selected.capacity, intentTags: (selected.intentTags ?? []).join(', ') }); setShowEdit(true); };
  const EventForm = ({ editing = false }: { editing?: boolean }) => <div className="border border-border rounded-xl p-4 mt-4 grid gap-3 bg-secondary/30">
    <input className="rounded-lg border p-2 text-sm" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
    <textarea className="rounded-lg border p-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    <div className="grid sm:grid-cols-2 gap-3"><input className="rounded-lg border p-2 text-sm" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><input className="rounded-lg border p-2 text-sm" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
    <div className="grid sm:grid-cols-2 gap-3"><input className="rounded-lg border p-2 text-sm" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /><input className="rounded-lg border p-2 text-sm" placeholder="Intent tags (comma separated)" value={form.intentTags} onChange={(e) => setForm({ ...form, intentTags: e.target.value })} /></div>
    <div className="flex gap-2"><button className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold" onClick={() => editing ? update.mutate() : create.mutate()}>{editing ? 'Save changes' : 'Create event'}</button><button className="px-3 py-2 rounded-lg border text-sm" onClick={() => editing ? setShowEdit(false) : setShowCreate(false)}>Cancel</button></div>
  </div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto h-full">
      <header className="mb-10">
        <p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">Curated crossings</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Events</h1>
        <p className="text-muted-foreground text-sm max-w-xl">Small gatherings selected for intent overlap. Attendee identities remain private unless they separately consent to connect.</p>
        <button onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-semibold"><Plus size={15} /> Create event</button>
        {showCreate && <EventForm />}
      </header>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6 items-start">
        <div className="grid gap-4">
          {eventsQuery.isLoading && <div className="p-8 text-sm text-muted-foreground">Loading events…</div>}
          {eventsQuery.isError && <div className="p-8 text-sm text-destructive">Unable to load events. Please try again.</div>}
          {!eventsQuery.isLoading && !eventsQuery.isError && events.length === 0 && <div className="p-8 text-sm text-muted-foreground">No upcoming events are available.</div>}
          {events.map((event) => (
            <button key={event.id} onClick={() => setSelectedId(event.id)} className={`text-left bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${selectedId === event.id ? 'border-primary ring-2 ring-primary/10' : 'border-border hover:border-foreground/30'}`}>
              <div className="grid sm:grid-cols-[160px_1fr]">
                <div className="w-full h-36 sm:h-full bg-secondary" aria-hidden="true" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
                     <Status status={event.rsvp?.status ?? 'open'} />
                  </div>
                  <div className="grid gap-2 mt-4 text-sm">
                    <span className="flex items-center gap-2"><CalendarIcon size={15} className="text-primary" /> {new Date(event.startsAt).toLocaleString()}</span>
                    <span className="flex items-center gap-2 text-muted-foreground"><MapPin size={15} /> {event.location}</span>
                    <span className="flex items-center gap-2 text-muted-foreground"><Users size={15} /> {event.attendeeCount ?? 0} attendees · {event.matching?.status === 'unavailable' ? 'Relevance unavailable' : 'Relevant matches available'}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <aside className="bg-white border border-border rounded-2xl p-6 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center gap-2 text-xs font-mono-custom uppercase tracking-wider text-muted-foreground mb-5">
              <ShieldCheck size={15} className="text-emerald-600" /> Attendee privacy protected
            </div>
            <h2 className="text-2xl font-bold mb-3">{selected.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.description}</p>
             {selected.matching?.status === 'available' ? <p className="text-xs text-emerald-700 mb-4">Intent relevance: {selected.matching.score}% · {(selected.matching.shared ?? []).join(', ') || 'adjacent interests'}</p> : <p className="text-xs text-muted-foreground mb-4">{selected.matching?.reason}</p>}
             <a href={`/api/social/events/${selected.id}/calendar.ics`} className="inline-flex text-sm font-semibold text-primary hover:underline mb-5">Download calendar invite</a>
            <dl className="grid gap-4 border-y border-border py-5 mb-6 text-sm">
               <div><dt className="text-xs text-muted-foreground mb-1">Hosted by</dt><dd className="font-semibold">{selected.createdBy ? 'Event administrator' : 'XSECT'}</dd></div>
               <div><dt className="text-xs text-muted-foreground mb-1">Time</dt><dd className="font-semibold flex items-center gap-2"><Clock3 size={15} /> {new Date(selected.startsAt).toLocaleString()}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Location</dt><dd className="font-semibold flex items-center gap-2"><MapPin size={15} /> {selected.location}</dd></div>
            </dl>
             {(selected.rsvp?.status === 'confirmed' || selected.rsvp?.status === 'requested' || selected.rsvp?.status === 'waitlisted') ? (
              <div className="space-y-3">
                 <div className="w-full py-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} /> {selected.rsvp?.status === 'confirmed' ? 'RSVP confirmed' : selected.rsvp?.status === 'waitlisted' ? 'On waitlist' : 'Invite requested'}</div>
                <button onClick={() => changeRsvp(selected, 'cancelled')} className="w-full py-2 text-sm font-semibold text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5"><X size={14} /> Cancel request</button>
              </div>
            ) : (
               <button onClick={() => changeRsvp(selected, 'requested')} className="w-full py-3 rounded-lg bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-colors">
                 {selected.rsvp?.status === 'cancelled' ? 'Request again' : 'Request invite'}
              </button>
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">Requesting an invite does not reveal your profile to attendees.</p>
             <div className="border-t mt-6 pt-5 space-y-4">
               <div className="flex items-center justify-between"><h3 className="font-semibold text-sm flex items-center gap-2"><Users size={15} /> Attendees ({detail?.attendees.length ?? selected.attendeeCount ?? 0})</h3><span className="text-[11px] text-muted-foreground">Protected identities</span></div>
               {detailQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading attendee details…</p> : detail?.attendees.map((attendee) => <div key={attendee.id} className="flex justify-between text-xs"><span>{attendee.label}</span><span className="text-muted-foreground">{attendee.relevance?.status === 'available' ? `${attendee.relevance.score}% relevant` : 'Private'}</span></div>)}
               <div className="flex items-center justify-between"><h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles size={15} /> XSECT generation</h3><button className="text-xs text-primary font-semibold" onClick={() => api(`/api/social/events/${selected.id}/generations`, { method: 'POST', body: JSON.stringify({ prompt: `Generate relevant XSECT introductions for ${selected.title}` }) }).then(() => queryClient.invalidateQueries({ queryKey: ['social', 'events', selected.id] }))}>Generate</button></div>
               {detail?.generations?.map((generation) => <div key={generation.id} className="text-xs rounded-lg bg-secondary p-2"><span className="font-semibold">{generation.status}</span> · {generation.output ?? generation.prompt}</div>)}
               <div className="flex gap-2"><button onClick={openEdit} className="text-xs font-semibold inline-flex items-center gap-1"><Pencil size={13} /> Manage</button><button onClick={() => api(`/api/social/events/${selected.id}/report`, { method: 'POST', body: JSON.stringify({ reason: 'Reported by attendee' }) }).then(() => toast({ title: 'Report submitted', description: 'Moderators will review this event.' }))} className="text-xs text-muted-foreground inline-flex items-center gap-1"><Flag size={13} /> Report</button></div>
               <div className="flex gap-2"><input className="min-w-0 flex-1 rounded border p-1.5 text-xs" placeholder="Admin user ID" value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} /><button onClick={() => api(`/api/social/events/${selected.id}/admins`, { method: 'POST', body: JSON.stringify({ userId: adminUserId }) }).then(() => { setAdminUserId(''); queryClient.invalidateQueries({ queryKey: ['social', 'events', selected.id] }); })} className="text-xs font-semibold inline-flex items-center gap-1"><UserPlus size={13} /> Add admin</button></div>
               {detail?.admins.map((admin) => <div key={admin.userId} className="text-xs text-muted-foreground">{admin.role}: {admin.userId}</div>)}
               {detail?.admins.length ? <button onClick={() => api(`/api/social/events/${selected.id}/cancel-event`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by event administrator' }) }).then(() => { toast({ title: 'Event cancelled' }); queryClient.invalidateQueries({ queryKey: ['social', 'events'] }); queryClient.invalidateQueries({ queryKey: ['social', 'events', selected.id] }); })} className="text-xs text-destructive font-semibold">Cancel event</button> : null}
               {showEdit && <EventForm editing />}
             </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const label = status === 'open' ? 'Open' : status === 'waitlisted' ? 'Waitlist' : status === 'cancelled' ? 'Cancelled' : status === 'requested' ? 'Requested' : 'Confirmed';
  return <span className="px-2.5 py-1 rounded-full bg-secondary text-[10px] uppercase tracking-wider font-mono-custom font-semibold shrink-0">{label}</span>;
}