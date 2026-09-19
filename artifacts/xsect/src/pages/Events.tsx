import { events } from '../lib/data';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming'|'past'>('upcoming');

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto reveal">
      <header className="mb-12 border-b border-border pb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-mono-custom text-xs uppercase tracking-widest text-primary">Gatherings</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Where paths converge.</h1>
        </div>
        <button className="px-6 py-3 bg-white/5 border border-border rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
          Host an Event
        </button>
      </header>

      <div className="grid lg:grid-cols-2 gap-8 reveal-1">
        {events.map(ev => (
          <div key={ev.id} className="bg-card border border-border rounded-3xl overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="h-64 relative overflow-hidden">
              <img src={ev.image} alt={ev.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent"></div>
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 flex items-center gap-2 font-mono-custom text-[10px] uppercase">
                <Calendar size={12} className="text-primary"/> {ev.date}
              </div>
            </div>
            
            <div className="p-8 relative -mt-10 z-10">
              <h3 className="font-serif text-3xl text-foreground mb-4">{ev.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{ev.description}</p>
              
              <div className="flex flex-col gap-3 mb-8 border-y border-white/5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin size={16}/> {ev.location}</div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Users size={16}/> {ev.attendees} Attending</div>
                  <div className="font-mono-custom text-[10px] text-primary bg-primary/10 px-2 py-1 rounded">
                    {ev.matchedAttendees} Signal Overlaps
                  </div>
                </div>
                <div className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">Hosted by:</span>
                  <span className="text-foreground">{ev.host}</span>
                </div>
              </div>
              
              <button className="w-full py-4 bg-foreground text-background rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
                {ev.rsvpStatus === 'waitlist' ? 'Join Waitlist' : 'Request Invite'} <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
