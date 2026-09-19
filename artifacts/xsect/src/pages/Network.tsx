import { useState } from 'react';
import { Network, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

export default function NetworkPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto reveal">
      <header className="mb-12 border-b border-border pb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span className="font-mono-custom text-xs uppercase tracking-widest text-accent">Trusted Paths</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Proximity is not enough.</h1>
        <p className="text-muted-foreground max-w-xl">
          See the trusted paths that make a cold intersection feel human, while identities stay protected.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 reveal-1">
        {/* Network Graph Visual */}
        <div className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center justify-center relative min-h-[400px] overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative w-full max-w-[300px] aspect-square">
            <div className="absolute inset-[15%] rounded-full border border-primary/20"></div>
            <div className="absolute inset-[35%] rounded-full border border-primary/30"></div>
            <div className="absolute inset-[50%] rounded-full border border-primary/40 bg-primary/5"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center font-serif text-primary shadow-[0_0_20px_var(--color-primary)] z-10">
              You
            </div>

            {/* Nodes */}
            {[
              {top: '10%', left: '40%', label: 'AM'},
              {top: '75%', left: '20%', label: 'RC'},
              {top: '80%', left: '70%', label: 'JD'},
              {top: '30%', left: '80%', label: 'KL'},
            ].map((n, i) => (
              <div key={i} className="absolute w-10 h-10 rounded-full bg-background border border-white/20 flex items-center justify-center font-mono-custom text-[10px] text-muted-foreground z-10" style={{top: n.top, left: n.left}}>
                {n.label}
              </div>
            ))}
            
            <svg className="absolute inset-0 w-full h-full opacity-40 z-0">
              <line x1="50%" y1="50%" x2="40%" y2="10%" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="20%" y2="75%" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>
          </div>
          
          <div className="mt-8 flex gap-6 text-[10px] font-mono-custom uppercase text-muted-foreground">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span> Trusted Node</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full border border-primary border-dashed"></span> Active Path</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-serif text-2xl text-foreground mb-2">Through a shared studio</h3>
                <p className="text-sm text-muted-foreground">A trusted node in your network has a strong relationship with Protected Professional #284.</p>
              </div>
              <Network size={24} className="text-primary" />
            </div>
            
            <div className="flex items-center justify-between mb-6 bg-background/50 rounded-xl p-4 border border-white/5">
              <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono-custom uppercase text-muted-foreground">You</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-4"></div>
              <span className="px-3 py-1 bg-white/5 rounded text-[10px] font-mono-custom uppercase text-muted-foreground">Trusted Node</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-4"></div>
              <span className="px-3 py-1 bg-primary/20 border border-primary/30 rounded text-[10px] font-mono-custom uppercase text-primary">#284</span>
            </div>

            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-primary hover:text-primary-foreground font-medium flex items-center gap-2"
            >
              {expanded ? 'Hide Details' : 'Explore Path'} <ArrowRight size={16} />
            </button>
            
            {expanded && (
              <div className="mt-4 p-4 bg-background border border-white/5 rounded-xl text-sm text-muted-foreground flex gap-3">
                <ShieldCheck size={18} className="text-primary shrink-0"/>
                The shared node is only revealed after both sides consent. For now, XSECT confirms a trusted overlap without exposing identity.
              </div>
            )}
          </div>
          
          <div className="bg-card border border-border rounded-3xl p-8 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2"><Activity size={16}/> Network Health</div>
              <div className="font-serif text-3xl text-foreground">Strong & Active</div>
            </div>
            <div className="text-right">
              <div className="font-mono-custom text-2xl text-primary">8.4<span className="text-sm text-muted-foreground">/10</span></div>
              <div className="text-xs text-muted-foreground mt-1">+16% this month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
