import { Link } from 'wouter';
import { Map, Shield, Workflow, Lock, ArrowRight, Activity, Crosshair } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20" data-testid="page-landing">
      <header className="px-6 md:px-12 py-5 flex justify-between items-center border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground rounded-md flex items-center justify-center shadow-sm">
            <span className="text-background font-bold font-sans text-sm tracking-tighter">XS</span>
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-foreground">
            XSECT
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" data-testid="link-sign-in" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up" data-testid="link-sign-up" className="text-sm font-semibold bg-foreground text-background px-5 py-2.5 rounded-md hover:bg-foreground/90 transition-all shadow-sm flex items-center gap-2">
            Request Access <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative isolate w-full overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-20" aria-hidden="true">
            <img
              src="/images/city-1.jpg"
              alt=""
              className="h-full w-full object-cover object-center opacity-30 saturate-[0.8]"
            />
          </div>
          <div
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_42%,rgba(255,255,255,0.70)_72%,rgba(255,255,255,0.82)_100%)] lg:bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.94)_38%,rgba(255,255,255,0.40)_72%,rgba(255,255,255,0.62)_100%)]"
            aria-hidden="true"
          />
          <div className="px-6 md:px-12 py-20 md:py-32 max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="flex-1 w-full max-w-2xl reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border mb-8 shadow-sm" data-testid="badge-network-type">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-mono-custom font-bold uppercase tracking-widest text-foreground">Private Network</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-bold tracking-tight text-foreground mb-6 leading-[1.05]" data-testid="text-hero-title">
              Intersect with intent.
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl font-medium" data-testid="text-hero-subtitle">
              A high-signal routing layer for ambitious professionals. We match capability, timing, and geographic proximity without exposing your identity until mutual consent is established.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up" data-testid="link-create-signal" className="inline-flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md font-bold text-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                Join the Network <ArrowRight size={18} />
              </Link>
              <Link href="/sign-in" data-testid="link-explore-network" className="inline-flex justify-center items-center gap-2 bg-secondary text-foreground px-8 py-4 rounded-md font-bold text-lg hover:bg-secondary/80 transition-all border border-border hover:-translate-y-0.5 shadow-sm">
                Enter Network
              </Link>
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-sm font-mono-custom text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center font-bold text-[10px] text-foreground z-[${4-i}]`}>
                    0{i}
                  </div>
                ))}
              </div>
              <span>Join 4,200+ protected active signals</span>
            </div>
          </div>
          
          {/* Visual Narrative Section */}
          <div className="flex-1 w-full relative reveal-2 lg:h-[650px] flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-square lg:aspect-auto lg:h-[550px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-black" data-testid="container-hero-visual">
              {/* Background Plate */}
              <div className="absolute inset-0">
                <img 
                  src="/images/landing-hero.jpg" 
                  alt="Abstract intersection" 
                  className="w-full h-full object-cover opacity-80 mix-blend-screen" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black/90"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
              </div>
              
              {/* Overlay UI Narrative */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start gap-4">
                  {/* Subject Signal */}
                  <div className="glass-card p-4 rounded-xl w-[48%] animate-float" data-testid="visual-card-subject">
                    <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                      <Crosshair size={14} className="text-primary" />
                      <span className="text-[10px] font-mono-custom uppercase tracking-wider text-white/80 font-bold">Origin Signal</span>
                    </div>
                    <div className="text-white font-bold text-sm mb-1">Product Strategy</div>
                    <div className="text-white/60 text-xs leading-snug">Seeking Technical Co-founder • Fintech</div>
                  </div>
                  
                  {/* Matched Signal */}
                  <div className="glass-card p-4 rounded-xl w-[48%] animate-float-delayed" data-testid="visual-card-match">
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                        <span className="text-[10px] font-mono-custom uppercase tracking-wider text-white/80 font-bold">Local Match</span>
                      </div>
                    </div>
                    <div className="text-white font-bold text-sm mb-1">Engineering Lead</div>
                    <div className="text-white/60 text-xs leading-snug">Exploring early-stage B2B ventures</div>
                  </div>
                </div>

                {/* Processing Middle Section */}
                <div className="flex flex-col items-center justify-center my-6 relative">
                  <div className="absolute h-[150%] w-px bg-gradient-to-b from-white/0 via-primary to-white/0"></div>
                  
                  <div className="glass-card px-4 py-2.5 rounded-full flex items-center gap-3 relative z-10 my-4 shadow-xl border-primary/30" data-testid="visual-badge-alignment">
                    <Activity size={16} className="text-primary" />
                    <span className="text-sm font-bold text-white tracking-wide">Intent Aligned</span>
                    <span className="text-xs text-white/60 font-mono-custom border-l border-white/20 pl-3">Dist: ~1.2km</span>
                  </div>
                </div>

                {/* Privacy Lock Action */}
                <div className="glass-card p-5 rounded-xl flex items-center justify-between mt-auto" data-testid="visual-card-action">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Lock size={14} className="text-primary" />
                      <span className="text-xs font-mono-custom uppercase tracking-wider text-white font-bold">Identity Protected</span>
                    </div>
                    <div className="text-white/70 text-xs font-medium">Names locked pending mutual consent.</div>
                  </div>
                  <div className="bg-primary text-white px-4 py-2 rounded-md text-xs font-bold shadow-lg">
                    Request Reveal
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="bg-secondary/50 border-y border-border py-24 px-6 md:px-12 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="max-w-[1400px] mx-auto relative z-10">
            <div className="mb-16 max-w-3xl reveal-1">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6" data-testid="text-features-title">
                The anti-network network.
              </h2>
              <p className="text-xl text-muted-foreground font-medium leading-relaxed" data-testid="text-features-subtitle">
                Professional networking has devolved into noisy feeds and passive collection. XSECT inverts this model: we prioritize immediate intent over historical accumulation, and private routing over public broadcast.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
              <div className="bg-background border border-border p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow reveal-2" data-testid="feature-card-intent">
                <div className="w-14 h-14 bg-secondary text-primary rounded-lg flex items-center justify-center mb-6 shadow-inner border border-border/50">
                  <Workflow size={28} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Intent-Driven Routing</h3>
                <p className="text-muted-foreground leading-relaxed font-medium text-base">
                  Stop collecting passive connections. XSECT routes you only to individuals whose immediate timing and current capabilities align precisely with your active goals.
                </p>
              </div>
              
              <div className="bg-background border border-border p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow reveal-3" data-testid="feature-card-privacy">
                <div className="w-14 h-14 bg-secondary text-primary rounded-lg flex items-center justify-center mb-6 shadow-inner border border-border/50">
                  <Shield size={28} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Zero-Knowledge Identity</h3>
                <p className="text-muted-foreground leading-relaxed font-medium text-base">
                  Appear strictly as a capability set and intent. Names, companies, and exact titles remain completely hidden behind cryptographic barriers until both parties explicitly consent.
                </p>
              </div>
              
              <div className="bg-background border border-border p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow reveal-4" data-testid="feature-card-proximity">
                <div className="w-14 h-14 bg-secondary text-primary rounded-lg flex items-center justify-center mb-6 shadow-inner border border-border/50">
                  <Map size={28} />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Ephemeral Proximity</h3>
                <p className="text-muted-foreground leading-relaxed font-medium text-base">
                  Discover signals actively transmitting within your approximate area. We never store exact coordinates—only transient regional overlap while your app is actively open.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 md:px-12 bg-background flex flex-col md:flex-row justify-between items-center gap-6" data-testid="footer">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center shadow-sm">
            <span className="text-background font-bold font-sans text-[10px] tracking-tighter">XS</span>
          </div>
          <span className="text-sm font-bold text-foreground">XSECT Inc. © {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-8 text-sm font-semibold text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">Privacy Protocol</a>
          <a href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-terms">Terms of Service</a>
          <a href="#" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}
