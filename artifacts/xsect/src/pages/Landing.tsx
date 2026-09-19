import { useStore } from '../store';
import { useLocation } from 'wouter';
import { ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-background">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/landing-hero.jpg" 
          alt="Abstract crossing paths" 
          className="w-full h-full object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/10"></div>
      </div>

      <header className="relative z-10 p-6 md:px-12 flex justify-between items-center reveal">
        <div className="font-serif text-2xl font-bold tracking-wider text-foreground">
          XSECT.
        </div>
        <button 
          onClick={() => setLocation('/onboarding')}
          className="text-sm font-medium tracking-wide border-b border-transparent hover:border-primary text-primary transition-all pb-1"
        >
          Enter Network
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-24 max-w-6xl">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6 reveal-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            <span className="font-mono-custom text-xs uppercase tracking-[0.2em] text-accent">Professional Serendipity</span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.1] text-foreground mb-8 reveal-2 text-balance">
            The right paths are <span className="italic text-primary/90">already</span> converging.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-12 reveal-3">
            A high-signal opportunity intelligence network. We find meaningful intersections between your intent, skills, and timing, without exposing identity until mutual consent.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 reveal-4">
            <button 
              onClick={() => setLocation('/onboarding')}
              className="group flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-lg hover:bg-primary/90 transition-all active:scale-95"
            >
              Enter XSECT <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-background/50 backdrop-blur-md mt-auto py-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 justify-between">
          <div className="flex items-start gap-4 reveal-4">
            <Shield className="text-primary mt-1" size={24} />
            <div>
              <h3 className="font-medium text-foreground">Zero Exposure</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">Your identity, exact role, and location remain entirely private until you explicitly consent to reveal them.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 reveal-5">
            <Zap className="text-accent mt-1" size={24} />
            <div>
              <h3 className="font-medium text-foreground">Timing is Everything</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">We don't just match skills; we match intent and timing, surfacing opportunities exactly when they matter.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
