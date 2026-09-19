import { Link } from 'wouter';
import { Map, Shield, Workflow, Lock, ArrowRight, Activity, Crosshair } from 'lucide-react';

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

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
        <section className="relative isolate w-full overflow-hidden border-b border-border bg-[#0b1018]">
          <div className="absolute inset-x-0 top-0 h-[700px] md:h-[640px] lg:inset-0 lg:h-auto -z-20" aria-hidden="true">
            <img
              src={publicAsset('/images/xsect-crossing-hero.jpg')}
              alt=""
              className="h-full w-full object-cover object-[62%_35%] md:object-[62%_70%] lg:object-[center_92%] brightness-[0.68] saturate-[1.04] contrast-[1.08]"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#0b1018] lg:hidden" />
          </div>
          <div className="px-6 md:px-12 py-14 md:py-20 lg:py-32 max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-24">
          <div className="flex-1 w-full max-w-2xl reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-6" data-testid="badge-network-type">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-mono-custom font-bold uppercase tracking-widest text-white">Private Network</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-[5rem] font-bold tracking-tight text-white mb-5 leading-[1.05] [text-shadow:0_3px_24px_rgba(0,0,0,0.85)]" data-testid="text-hero-title">
              Intersect with intent.
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-xl font-medium [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]" data-testid="text-hero-subtitle">
              Meet the right professionals when opportunity and timing align. XSECT connects people whose expertise, goals, and proximity complement one another—while keeping both identities private until there is mutual interest.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up" data-testid="link-create-signal" className="inline-flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md font-bold text-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                Join the Network <ArrowRight size={18} />
              </Link>
              <Link href="/sign-in" data-testid="link-explore-network" className="inline-flex justify-center items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-md font-bold text-lg hover:bg-white/15 transition-all border border-white/20 hover:-translate-y-0.5">
                Enter Network
              </Link>
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-sm font-mono-custom text-white/65">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0b1018] bg-white/15 flex items-center justify-center font-bold text-[10px] text-white z-[${4-i}]`}>
                    0{i}
                  </div>
                ))}
              </div>
              <span>Join 4,200+ protected active signals</span>
            </div>
          </div>
          
          {/* Visual Narrative Section */}
          <div className="flex-1 relative reveal-2 lg:h-[650px] flex items-center justify-center w-[calc(100%+3rem)] md:w-[calc(100%+6rem)] lg:w-full -mx-6 md:-mx-12 lg:mx-0">
            <div className="relative w-full max-w-none aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:h-full min-h-[560px] overflow-hidden border-y lg:border border-white/20 shadow-2xl bg-black" data-testid="container-hero-visual">
              {/* Background Plate */}
              <div className="absolute inset-0">
                <img 
                  src={publicAsset('/images/landing-hero.jpg')}
                  alt="Abstract intersection" 
                  className="w-full h-full object-cover opacity-95" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/45 to-black/85"></div>
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

                {/* Match explanation */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-mono-custom uppercase tracking-[0.18em] text-white/55 font-semibold">Why this surfaced</span>
                    <div className="h-px flex-1 bg-white/15" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <div className="glass-card rounded-xl p-3 md:p-4">
                      <div className="text-primary text-lg md:text-xl font-bold mb-1">92%</div>
                      <div className="text-white text-[11px] md:text-xs font-semibold">Intent fit</div>
                      <div className="text-white/45 text-[9px] md:text-[10px] mt-1">Goals overlap now</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 md:p-4">
                      <div className="text-blue-400 text-lg md:text-xl font-bold mb-1">2</div>
                      <div className="text-white text-[11px] md:text-xs font-semibold">Trusted paths</div>
                      <div className="text-white/45 text-[9px] md:text-[10px] mt-1">Mutual network nodes</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 md:p-4">
                      <div className="text-emerald-400 text-lg md:text-xl font-bold mb-1">5 days</div>
                      <div className="text-white text-[11px] md:text-xs font-semibold">Timing window</div>
                      <div className="text-white/45 text-[9px] md:text-[10px] mt-1">Both actively looking</div>
                    </div>
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

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              <article className="group bg-background border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden reveal-2" data-testid="feature-card-intent">
                <div className="relative h-56 overflow-hidden">
                  <img src={publicAsset('/images/revealed-1.jpg')} alt="Professionals meeting in a city" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute left-5 right-5 bottom-5 flex items-center justify-between gap-3">
                    <div className="px-3 py-2 rounded-lg bg-black/55 backdrop-blur-md border border-white/15 text-white">
                      <p className="text-[10px] font-mono-custom uppercase tracking-wider text-white/65">Your signal</p>
                      <p className="text-sm font-bold">Seeking a technical partner</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Workflow size={19} />
                    </div>
                </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">People who want the same next step</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-sm">
                    See professionals whose skills, needs, and availability line up with what you are trying to do right now.
                  </p>
                </div>
              </article>
              
              <article className="group bg-background border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden reveal-3" data-testid="feature-card-privacy">
                <div className="relative h-56 overflow-hidden">
                  <img src={publicAsset('/images/obscured-2.jpg')} alt="Protected professional identity" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                  <div className="absolute inset-x-5 bottom-5 p-4 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-primary" />
                      <span className="text-[10px] font-mono-custom uppercase tracking-widest font-bold">Identity protected</span>
                    </div>
                    <p className="text-sm text-white/70">Name and company unlock only after mutual consent.</p>
                </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">Private until you both say yes</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-sm">
                    Explore a person’s goals and strengths without exposing names, employers, or contact details before a mutual reveal.
                  </p>
                </div>
              </article>
              
              <article className="group bg-background border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden reveal-4" data-testid="feature-card-proximity">
                <div className="relative h-56 overflow-hidden">
                  <img src={publicAsset('/images/event-1.jpg')} alt="Professionals gathering at an evening event" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute left-5 right-5 bottom-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Map size={19} />
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-black/55 backdrop-blur-md border border-white/15 text-white flex-1">
                      <p className="text-[10px] font-mono-custom uppercase tracking-wider text-white/65">Approximate area</p>
                      <p className="text-sm font-bold">7 relevant signals nearby</p>
                    </div>
                </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">Useful proximity, not surveillance</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-sm">
                    Find relevant people and gatherings in your approximate area while the app is open. Exact coordinates are never shown.
                  </p>
                </div>
              </article>
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
