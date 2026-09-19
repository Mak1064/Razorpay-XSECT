import { useState } from 'react';
import { useStore } from '../store';
import { ShieldCheck, MapPin, Briefcase, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

const DISCOVER_MOCK_DATA = [
  { id: '1', role: 'Staff Engineer', intent: 'Looking for a seed-stage technical co-founder', distance: '1.2km', matchScore: 94, skills: ['Rust', 'Distributed Systems'], status: 'protected' },
  { id: '2', role: 'VP of Product', intent: 'Exploring zero-to-one roles in climate tech', distance: '3.5km', matchScore: 88, skills: ['0 to 1', 'B2B SaaS'], status: 'protected' },
  { id: '3', role: 'Lead Designer', intent: 'Seeking principal IC role at Series B+', distance: '0.8km', matchScore: 82, skills: ['Design Systems', 'Framer'], status: 'protected' },
];

export default function Discover() {
  const { state, requestConnection } = useStore();
  const { toast } = useToast();
  const [filterActive, setFilterActive] = useState(false);

  const handleConnect = (id: string) => {
    requestConnection(id);
    toast({ title: 'Request Sent', description: 'They will be notified of your signal.' });
  };

  const isPro = state.plan !== 'free';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Discovery Feed</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            High-signal intersections based on your intent and location history.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => isPro ? setFilterActive(!filterActive) : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filterActive ? 'bg-secondary border-border text-foreground' : 'bg-white border-border text-foreground hover:bg-secondary/50'} ${!isPro ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Filter size={16} /> Filters {isPro ? <ChevronDown size={14}/> : <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-mono-custom">Pro</span>}
          </button>
        </div>
      </header>

      {!isPro && (
        <div className="mb-8 p-4 bg-secondary/50 border border-border rounded-xl flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">Advanced filters and intent matching are locked.</div>
          <Link href="/plans" className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
            Upgrade
          </Link>
        </div>
      )}

      <div className="grid gap-6">
        {DISCOVER_MOCK_DATA.map((item) => (
          <div key={item.id} className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-mono-custom font-semibold uppercase tracking-wider">
                    <ShieldCheck size={12} /> {item.status}
                  </div>
                  <span className="text-sm font-mono-custom text-muted-foreground font-semibold flex items-center gap-1">
                    <MapPin size={14} /> {item.distance}
                  </span>
                  <span className="ml-auto text-sm font-bold text-primary flex items-center gap-1">
                    {item.matchScore}% Match
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-2">{item.role}</h3>
                <p className="text-foreground text-sm font-medium mb-4 leading-relaxed">"{item.intent}"</p>
                
                <div className="flex flex-wrap gap-2">
                  {item.skills.map(skill => (
                    <span key={skill} className="px-2.5 py-1 bg-secondary text-foreground rounded text-xs font-mono-custom font-medium border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="md:w-48 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                {state.connectionsRequested.includes(item.id) ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary">
                    <CheckCircle2 size={18} /> Request Sent
                  </div>
                ) : (
                  <button 
                    onClick={() => handleConnect(item.id)}
                    className="w-full py-2.5 bg-foreground text-background rounded-lg text-sm font-bold hover:bg-foreground/90 transition-colors"
                  >
                    Request Reveal
                  </button>
                )}
                <button className="w-full py-2.5 bg-white border border-border text-foreground rounded-lg text-sm font-bold hover:bg-secondary transition-colors">
                  Save for Later
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
