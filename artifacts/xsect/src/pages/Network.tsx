import { useStore } from '../store';
import { ShieldCheck, Search } from 'lucide-react';
import { useState } from 'react';

const NETWORK_MOCK = [
  { id: '4', name: 'Alex Rivera', role: 'Staff Product Designer', intent: 'Looking for a senior IC role at a Series C+ company', status: 'unlocked' },
  { id: '5', name: 'Taylor Swift', role: 'VP Engineering', intent: 'Building an early team for a fintech spinout', status: 'unlocked' },
  { id: '6', name: 'Protected Professional', role: 'Senior Software Engineer', intent: 'Exploring AI infrastructure opportunities', status: 'pending' },
];

export default function NetworkPage() {
  const { state, acceptConnection } = useStore();
  const [search, setSearch] = useState('');
  
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">Your Network</h1>
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search active connections..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border flex justify-between items-end">
            Pending Requests <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">1</span>
          </h2>
          <div className="grid gap-4">
            {NETWORK_MOCK.filter(n => n.status === 'pending').map(person => (
              <div key={person.id} className="bg-white border border-border p-5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-primary" />
                    <span className="font-bold text-foreground">{person.role}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">"{person.intent}"</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-colors">Ignore</button>
                  <button 
                    onClick={() => acceptConnection(person.id)}
                    className="px-4 py-2 bg-foreground text-background text-sm font-bold rounded-lg hover:bg-foreground/90 transition-colors"
                  >
                    Accept & Reveal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">
            Active Connections
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {NETWORK_MOCK.filter(n => n.status === 'unlocked' || state.unlockedIdentities.includes(n.id)).map(person => (
              <div key={person.id} className="bg-white border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-secondary border border-border rounded-full flex items-center justify-center font-bold text-lg text-foreground">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{person.name}</h3>
                    <p className="text-xs font-mono-custom text-muted-foreground">{person.role}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground font-medium bg-secondary p-3 rounded-lg line-clamp-2">
                  "{person.intent}"
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
