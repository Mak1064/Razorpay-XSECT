import { Calendar as CalendarIcon, MapPin, Users } from 'lucide-react';
import { useState } from 'react';

const EVENTS_MOCK = [
  { id: '1', title: 'Climate Tech Founder Mixer', date: 'Tomorrow, 6:00 PM', location: 'Downtown SF', attendees: 24, status: 'upcoming' },
  { id: '2', title: 'Hard Tech Engineering Coffee', date: 'Friday, 8:00 AM', location: 'Mission District', attendees: 12, status: 'upcoming' },
];

export default function EventsPage() {
  const [rsvp, setRsvp] = useState<string[]>([]);

  const handleRsvp = (id: string) => {
    if (rsvp.includes(id)) {
      setRsvp(rsvp.filter(i => i !== id));
    } else {
      setRsvp([...rsvp, id]);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Events</h1>
        <p className="text-muted-foreground text-sm max-w-lg">
          High-density crossing points curated based on your orbit and intent.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {EVENTS_MOCK.map((event) => (
          <div key={event.id} className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-foreground mb-4">{event.title}</h3>
            
            <div className="space-y-3 mb-8 flex-1">
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <CalendarIcon size={16} className="text-primary" /> {event.date}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <MapPin size={16} className="text-primary" /> {event.location}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <Users size={16} className="text-primary" /> {event.attendees} high-signal attendees
              </div>
            </div>
            
            <button 
              onClick={() => handleRsvp(event.id)}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${rsvp.includes(event.id) ? 'bg-secondary text-foreground border border-border' : 'bg-foreground text-background hover:bg-foreground/90'}`}
            >
              {rsvp.includes(event.id) ? 'RSVP Confirmed' : 'Request Invite'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
