import { Link } from 'wouter';
import { Map, Shield, Workflow } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="px-6 md:px-12 py-6 flex justify-between items-center border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="XSECT Logo" className="w-6 h-6" />
          <span className="font-sans font-bold text-xl tracking-tight text-foreground">
            XSECT
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up" className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-md hover:bg-foreground/90 transition-colors">
            Join Network
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-mono-custom font-medium uppercase tracking-wider">High-Signal Network</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]">
              Intersect with intent.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
              XSECT connects professionals by finding exact intersections between capability, timing, and geographic proximity—without exposing identity until there's mutual consent.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up" className="inline-flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-md font-medium text-lg hover:bg-primary/90 transition-colors">
                Start Routing
              </Link>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="aspect-square bg-white rounded-2xl border border-border shadow-xl overflow-hidden relative isolate">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-primary/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full border border-primary/40 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(249,87,38,0.5)]"></div>
              
              {/* Nodes */}
              <div className="absolute top-[20%] left-[30%] w-3 h-3 bg-foreground rounded-full"></div>
              <div className="absolute top-[70%] left-[20%] w-3 h-3 bg-muted-foreground rounded-full"></div>
              <div className="absolute top-[30%] left-[70%] w-3 h-3 bg-foreground rounded-full"></div>
              <div className="absolute top-[60%] left-[80%] w-3 h-3 bg-muted-foreground rounded-full"></div>
              
              {/* Connecting lines */}
              <svg className="absolute inset-0 w-full h-full stroke-primary/30" strokeWidth="2" strokeDasharray="4 4" fill="none">
                <line x1="30%" y1="20%" x2="50%" y2="50%" />
                <line x1="70%" y1="30%" x2="50%" y2="50%" />
                <line x1="20%" y1="70%" x2="50%" y2="50%" />
              </svg>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white border-y border-border py-24 px-6 md:px-12">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
            <div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <Map size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Approximate Proximity</h3>
              <p className="text-muted-foreground leading-relaxed">
                Discover active professionals in your general vicinity. We never persist exact coordinates—only regional overlap while your app is open.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Zero-Knowledge Identity</h3>
              <p className="text-muted-foreground leading-relaxed">
                Appear only as a skill-set and current intent. Names, companies, and exact titles are locked behind mutual consent requests.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <Workflow size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Intent-Driven Routing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stop accumulating connections. XSECT routes you only to individuals whose immediate timing aligns with your active goals.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 md:px-12 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} XSECT Inc.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
        </div>
      </footer>
    </div>
  );
}
