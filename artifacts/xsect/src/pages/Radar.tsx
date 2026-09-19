import { useStore } from '../store';
import { opportunities, moments } from '../lib/data';
import { Link } from 'wouter';
import { Target, ArrowUpRight, Zap, Network, Crosshair, EyeOff, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Radar() {
  const { state, requestConnection } = useStore();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState('All signals');
  
  const handleRequest = (id: string) => {
    requestConnection(id);
    toast({
      title: "Connection Request Sent",
      description: "Identity remains protected until mutual consent.",
      duration: 3000,
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto reveal">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            <span className="font-mono-custom text-xs uppercase tracking-widest text-accent">Radar / Active Orbit</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground">The shape of your network.</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono-custom uppercase tracking-wider">
            14 Live Signals
          </span>
          <span className="text-xs text-muted-foreground font-mono-custom">Updated 2m ago</span>
        </div>
      </header>

      {/* Top Section: Radar Map & Highlights */}
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6 mb-12 reveal-1">
        {/* Radar Visualization */}
        <div className="relative aspect-square rounded-3xl bg-card border border-border overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-primary/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full border border-primary/20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] rounded-full border border-primary/30"></div>
          
          <div className="radar-sweep absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left border-l border-t border-primary/40 bg-gradient-to-br from-primary/10 to-transparent" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-[0_0_15px_var(--color-accent)] z-10"></div>
          
          {[
            {top: '25%', left: '35%', score: 94, active: true},
            {top: '65%', left: '75%', score: 88, active: false},
            {top: '45%', left: '20%', score: 79, active: false},
            {top: '80%', left: '40%', score: 72, active: false}
          ].map((pt, i) => (
            <div key={i} className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 ${pt.active ? 'radar-pulse' : ''}`} style={{ top: pt.top, left: pt.left }}>
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono-custom text-[10px] ${pt.active ? 'border-primary bg-primary/20 text-primary' : 'border-accent/40 bg-accent/10 text-accent'}`}>
                {pt.score}
              </div>
            </div>
          ))}
          
          <div className="absolute bottom-4 left-4 glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2 border-white/10">
            <MapPin size={12} className="text-accent" />
            <span className="font-mono-custom text-[9px] uppercase text-muted-foreground">SF Bay Area</span>
          </div>
        </div>

        {/* Highlights */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-8 border-accent/20 h-full flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={120} className="text-accent rotate-12" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono-custom text-xs uppercase tracking-widest text-muted-foreground">Today's Strongest Signal</span>
                <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] animate-pulse"></span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4 max-w-md">A window is opening in climate systems.</h2>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Two nearby intent signals overlap heavily with your declared focus on operating early-stage climate teams.
              </p>
            </div>
            
            <div className="flex items-end justify-between mt-8 pt-6 border-t border-white/5">
              <div>
                <div className="font-serif text-4xl text-accent">+31%</div>
                <div className="font-mono-custom text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Signal strength this week</div>
              </div>
              <Link href="/discover" className="text-sm font-medium text-foreground hover:text-accent flex items-center gap-1 transition-colors">
                View Signals <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 h-48">
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">XSECT Score</span>
                <Target size={16} className="text-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-serif text-4xl text-foreground">84</span>
                  <span className="font-mono-custom text-xs text-primary">+6 this month</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[84%] rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Path Density</span>
                <Network size={16} className="text-accent" />
              </div>
              <div>
                <div className="font-serif text-3xl text-foreground mb-2">High</div>
                <p className="text-xs text-muted-foreground leading-relaxed">More trusted nodes are active near your orbit.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closest Intersections */}
      <div className="reveal-2 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="font-mono-custom text-xs uppercase tracking-widest text-primary">Closest Intersections</span>
            </div>
            <h2 className="font-serif text-3xl text-foreground">Worth a closer look</h2>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {['All signals', 'High score', 'Trusted path'].map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs transition-colors ${
                  activeFilter === filter 
                    ? 'bg-white/10 text-foreground border border-white/20' 
                    : 'text-muted-foreground border border-transparent hover:text-foreground'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {opportunities.slice(0,3).map(opt => {
            const requested = state.connectionsRequested.includes(opt.id);
            return (
              <div key={opt.id} className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/40 transition-colors duration-300 flex flex-col">
                <div className="h-40 overflow-hidden relative border-b border-border">
                  <img 
                    src={opt.obscuredImage} 
                    alt="Protected Profile" 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 blur-[2px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 border-primary bg-primary/20 backdrop-blur-md flex items-center justify-center">
                    <span className="font-serif text-lg text-primary">{opt.score}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="px-2 py-1 bg-background/80 backdrop-blur text-[10px] font-mono-custom uppercase text-primary rounded border border-primary/20">
                      {opt.type}
                    </span>
                    <span className="px-2 py-1 bg-background/80 backdrop-blur text-[10px] font-mono-custom uppercase text-foreground rounded border border-white/10">
                      {opt.timing}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-xl text-foreground mb-3 leading-snug">{opt.title}</h3>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5"><EyeOff size={14}/> Protected #{opt.id.split('_')[1]}</div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5"><MapPin size={14}/> {opt.area}</div>
                  </div>
                  
                  <div className="mt-auto space-y-4">
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono-custom uppercase text-muted-foreground mb-3">
                        <Crosshair size={12} className="text-primary" /> Why this surfaced
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opt.why.map(w => (
                          <span key={w} className="px-2.5 py-1 rounded bg-white/5 border border-white/5 text-[11px] text-muted-foreground">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleRequest(opt.id)}
                      disabled={requested}
                      className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                        requested 
                          ? 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5' 
                          : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                    >
                      {requested ? 'Request Pending' : 'Request Connection'} {!requested && <ArrowUpRight size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Moments */}
      <div className="reveal-3 mt-12 pt-12 border-t border-border">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span className="font-mono-custom text-xs uppercase tracking-widest text-accent">Recent Moments</span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {moments.slice(0, 2).map(m => (
            <div key={m.id} className="bg-card border border-border rounded-2xl p-6 hover:border-white/20 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="font-mono-custom text-[10px] uppercase text-muted-foreground">{m.time}</span>
                {m.type === 'moment' && <Zap size={16} className="text-accent" />}
                {m.type === 'path' && <Network size={16} className="text-primary" />}
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
