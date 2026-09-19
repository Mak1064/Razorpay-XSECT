import { useState } from 'react';
import { opportunities } from '../lib/data';
import { useStore } from '../store';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, EyeOff, MapPin, Target, Sparkles, ArrowUpRight } from 'lucide-react';

export default function Discover() {
  const [search, setSearch] = useState('');
  const { state, requestConnection } = useStore();
  const { toast } = useToast();

  const filtered = opportunities.filter(o => 
    o.title.toLowerCase().includes(search.toLowerCase()) || 
    o.intent.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto reveal">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-mono-custom text-xs uppercase tracking-widest text-primary">Discover</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Find the overlap.</h1>
          <p className="text-muted-foreground max-w-xl">
            Browse protected opportunities surfaced by your intent, skills, timing, place, and trusted network.
          </p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-10 reveal-1">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by intent, skill, or signal..."
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-card border border-border rounded-2xl text-sm font-medium hover:bg-white/5 transition-colors">
          <Filter size={18} /> Tune Signals
        </button>
      </div>

      <div className="flex justify-between items-center mb-6 reveal-2">
        <span className="font-mono-custom text-xs uppercase text-muted-foreground">{filtered.length} Protected Signals</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 reveal-3">
        {filtered.map(opt => {
          const requested = state.connectionsRequested.includes(opt.id);
          
          return (
            <div key={opt.id} className="flex flex-col sm:flex-row gap-6 bg-card border border-border rounded-3xl p-4 hover:border-white/20 transition-all">
              <div className="sm:w-1/3 aspect-square sm:aspect-auto rounded-2xl overflow-hidden relative shrink-0">
                <img src={opt.obscuredImage} alt="Protected" className="w-full h-full object-cover blur-[2px] opacity-80" />
                <div className="absolute inset-0 bg-background/20"></div>
                <div className="absolute top-3 left-3 bg-background/80 backdrop-blur px-2 py-1 rounded text-[10px] font-mono-custom text-primary border border-primary/20">
                  {opt.score} MATCH
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-2 pr-2">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-serif text-xl leading-tight">{opt.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <EyeOff size={12}/> Protected #{opt.id.split('_')[1]}
                    <span className="mx-1">·</span>
                    <MapPin size={12}/> {opt.area}
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono-custom uppercase text-primary mb-2">
                      <Sparkles size={12}/> Shared Context
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.why.slice(0,2).map(w => (
                        <span key={w} className="px-2 py-1 bg-white/5 rounded text-[11px] text-muted-foreground">{w}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    requestConnection(opt.id);
                    toast({title: "Request Sent", description: "Identity remains protected."});
                  }}
                  disabled={requested}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    requested ? 'bg-white/5 text-muted-foreground border border-white/5' : 'bg-white/10 hover:bg-white/20 text-foreground'
                  }`}
                >
                  {requested ? 'Pending' : 'Request Connection'} {!requested && <ArrowUpRight size={16}/>}
                </button>
              </div>
            </div>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="col-span-2 py-24 text-center border border-dashed border-border rounded-3xl">
            <Target size={40} className="mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-serif text-xl mb-2">No signals match</h3>
            <p className="text-muted-foreground text-sm">Try broadening your search intent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
