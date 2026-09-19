import { useState } from 'react';
import { useUser } from '@clerk/react';
import { Calendar as CalendarIcon, Check, Clock3, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActivityEvent, useActivity } from '../lib/activity';

export default function EventsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const activity = useActivity(user?.id);
  const [selectedId, setSelectedId] = useState(activity.snapshot.events[0]?.id ?? '');
  const selected = activity.snapshot.events.find((event) => event.id === selectedId);

  const changeRsvp = (event: ActivityEvent, next: ActivityEvent['rsvp']) => {
    activity.updateEventRsvp(event.id, next);
    const title = next === 'cancelled' ? 'RSVP cancelled' : next === 'waitlist' ? 'Added to waitlist' : 'Invite requested';
    toast({ title, description: 'Your event status has been saved on this device.' });
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto h-full">
      <header className="mb-10">
        <p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">Curated crossings</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Events</h1>
        <p className="text-muted-foreground text-sm max-w-xl">Small gatherings selected for intent overlap. Attendee identities remain private unless they separately consent to connect.</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-6 items-start">
        <div className="grid gap-4">
          {activity.snapshot.events.map((event) => (
            <button key={event.id} onClick={() => setSelectedId(event.id)} className={`text-left bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${selectedId === event.id ? 'border-primary ring-2 ring-primary/10' : 'border-border hover:border-foreground/30'}`}>
              <div className="grid sm:grid-cols-[160px_1fr]">
                <img src={event.image} alt="" className="w-full h-36 sm:h-full object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
                    <Status status={event.rsvp} />
                  </div>
                  <div className="grid gap-2 mt-4 text-sm">
                    <span className="flex items-center gap-2"><CalendarIcon size={15} className="text-primary" /> {event.date}</span>
                    <span className="flex items-center gap-2 text-muted-foreground"><MapPin size={15} /> {event.location}</span>
                    <span className="flex items-center gap-2 text-muted-foreground"><Users size={15} /> {event.matchedAttendees} matched of {event.attendees} attendees</span>
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
            <dl className="grid gap-4 border-y border-border py-5 mb-6 text-sm">
              <div><dt className="text-xs text-muted-foreground mb-1">Hosted by</dt><dd className="font-semibold">{selected.host}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Time</dt><dd className="font-semibold flex items-center gap-2"><Clock3 size={15} /> {selected.date}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Location</dt><dd className="font-semibold flex items-center gap-2"><MapPin size={15} /> {selected.location}</dd></div>
            </dl>
            {selected.rsvp === 'confirmed' || selected.rsvp === 'requested' ? (
              <div className="space-y-3">
                <div className="w-full py-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-bold flex items-center justify-center gap-2"><Check size={16} /> {selected.rsvp === 'confirmed' ? 'RSVP confirmed' : 'Invite requested'}</div>
                <button onClick={() => changeRsvp(selected, 'cancelled')} className="w-full py-2 text-sm font-semibold text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5"><X size={14} /> Cancel request</button>
              </div>
            ) : (
              <button onClick={() => changeRsvp(selected, selected.rsvp === 'waitlist' ? 'waitlist' : 'requested')} className="w-full py-3 rounded-lg bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-colors">
                {selected.rsvp === 'waitlist' ? 'Join waitlist' : selected.rsvp === 'cancelled' ? 'Request again' : 'Request invite'}
              </button>
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">Requesting an invite does not reveal your profile to attendees.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function Status({ status }: { status: ActivityEvent['rsvp'] }) {
  const label = status === 'open' ? 'Open' : status === 'waitlist' ? 'Waitlist' : status === 'cancelled' ? 'Cancelled' : status === 'requested' ? 'Requested' : 'Confirmed';
  return <span className="px-2.5 py-1 rounded-full bg-secondary text-[10px] uppercase tracking-wider font-mono-custom font-semibold shrink-0">{label}</span>;
}