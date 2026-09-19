import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Crosshair, PauseCircle, PlayCircle, ShieldAlert, Navigation, Shield, Activity, MapPin } from 'lucide-react';
import { Link } from 'wouter';

export default function Radar() {
  const { state, setLocationTrackingStatus } = useStore();
  const [errorMsg, setErrorMsg] = useState('');
  const watchId = useRef<number | null>(null);

  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setLocationTrackingStatus('error');
      return;
    }

    setLocationTrackingStatus('tracking', null);
    
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationTrackingStatus('tracking', pos.coords.accuracy);
      },
      (err) => {
        setErrorMsg(err.message);
        setLocationTrackingStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const pauseTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLocationTrackingStatus('paused');
  };

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto h-full flex flex-col fade-in" data-testid="page-radar">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3" data-testid="text-radar-title">Local Area Scanner</h1>
          <p className="text-muted-foreground text-sm max-w-lg font-medium leading-relaxed" data-testid="text-radar-subtitle">
            Discover active signals within your approximate vicinity. Tracking remains ephemeral and terminates when this session ends. Exact coordinates are never persisted.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {state.locationTracking === 'idle' && (
            <button 
              onClick={startTracking}
              data-testid="button-start-tracking"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-bold text-sm hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5"
            >
              <Navigation size={16} /> Enable Local Scanner
            </button>
          )}
          {state.locationTracking === 'tracking' && (
            <div className="flex items-center gap-4 bg-background border border-border px-4 py-2 rounded-md shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground" data-testid="status-tracking-active">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                Scanner Active
              </div>
              <div className="w-px h-5 bg-border"></div>
              <button onClick={pauseTracking} data-testid="button-pause-tracking" className="text-muted-foreground hover:text-foreground transition-colors" title="Pause Scanner">
                <PauseCircle size={20} />
              </button>
            </div>
          )}
          {state.locationTracking === 'paused' && (
            <div className="flex items-center gap-4 bg-secondary px-4 py-2 rounded-md border border-border">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground" data-testid="status-tracking-paused">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50"></span>
                Scanner Paused
              </div>
              <div className="w-px h-5 bg-border"></div>
              <button onClick={startTracking} data-testid="button-resume-tracking" className="text-foreground hover:text-primary transition-colors" title="Resume Scanner">
                <PlayCircle size={20} />
              </button>
            </div>
          )}
          {state.locationTracking === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-sm font-bold bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-md" data-testid="status-tracking-error">
              <ShieldAlert size={16} /> Permission denied
              <button onClick={startTracking} className="ml-2 underline hover:text-destructive/80 transition-colors">Retry</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_400px] gap-8 h-full min-h-[500px]">
        {/* Advanced Radar Visualization Area */}
        <div className="bg-secondary/40 border border-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[400px] shadow-inner" data-testid="container-radar-visual">
          {state.locationTracking !== 'tracking' ? (
            <div className="text-center p-8 max-w-sm bg-background border border-border rounded-xl shadow-lg relative z-10" data-testid="state-radar-offline">
              <div className="w-16 h-16 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Crosshair size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Scanner Offline</h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
                {state.locationTracking === 'error' 
                  ? errorMsg || "Location access is required to discover local signals."
                  : "Enable the local scanner to ping nearby active professional signals."}
              </p>
              {state.locationTracking !== 'error' && (
                <button onClick={startTracking} className="bg-foreground text-background px-6 py-3 rounded-md font-bold text-sm shadow-sm hover:bg-foreground/90 transition-all hover:-translate-y-0.5 w-full">
                  Initialize Scanner
                </button>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 bg-background/50">
              {/* Tactical Map Background */}
              <img src="/images/city-1.jpg" alt="City Map Base" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] grayscale contrast-150 mix-blend-multiply" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Crosshairs & Grid */}
                <div className="absolute w-full h-px bg-primary/10"></div>
                <div className="absolute h-full w-px bg-primary/10"></div>
                
                {/* Concentric Distance Rings with tactical labels */}
                <div className="absolute w-[85%] h-[85%] border border-primary/20 rounded-full flex items-start justify-center pt-1 shadow-[inset_0_0_30px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] text-primary/70 font-mono-custom bg-background/80 backdrop-blur px-2 py-0.5 rounded shadow-sm font-bold border border-primary/10">2.0km Range</span>
                </div>
                <div className="absolute w-[55%] h-[55%] border border-primary/25 rounded-full flex items-start justify-center pt-1 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] text-primary/80 font-mono-custom bg-background/80 backdrop-blur px-2 py-0.5 rounded shadow-sm font-bold border border-primary/20">1.0km Range</span>
                </div>
                <div className="absolute w-[25%] h-[25%] border border-primary/30 rounded-full flex items-start justify-center pt-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] text-primary font-mono-custom bg-background/80 backdrop-blur px-2 py-0.5 rounded shadow-sm font-bold border border-primary/30">500m Core</span>
                </div>
                
                {/* Scanner Sweep */}
                <div className="absolute inset-0 radar-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_70%,rgba(var(--primary),0.05)_90%,rgba(var(--primary),0.15)_100%)] border-r-2 border-primary/40"></div>
                
                {/* User Location Node */}
                <div className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.8)] z-10 flex items-center justify-center">
                  <div className="absolute w-12 h-12 border border-primary rounded-full animate-ping opacity-40"></div>
                  <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                </div>
                
                {/* Interactive Signal Nodes */}
                <div className="absolute top-[28%] left-[68%] flex flex-col items-center gap-1.5 group cursor-pointer z-20 hover:z-30 transition-all" data-testid="radar-node-alpha">
                  <div className="w-3 h-3 bg-foreground rounded-full relative shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                    <div className="absolute w-[300%] h-[300%] border border-foreground/50 rounded-full -top-[100%] -left-[100%] animate-ping opacity-30"></div>
                  </div>
                  <div className="bg-background/95 backdrop-blur-md border border-border px-3 py-2 rounded-lg shadow-xl text-center transform scale-0 group-hover:scale-100 transition-all origin-bottom duration-200 absolute -top-[4.5rem] w-[140px]">
                    <div className="text-[11px] font-mono-custom font-bold text-foreground mb-1">Engineering Leadership</div>
                    <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground font-medium">
                      <MapPin size={10} /> ~800m
                      <span className="text-border">•</span>
                      <Shield size={10} className="text-primary" /> Protected
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-[65%] left-[30%] flex flex-col items-center gap-1.5 group cursor-pointer z-20 hover:z-30 transition-all" data-testid="radar-node-beta">
                  <div className="w-2.5 h-2.5 bg-muted-foreground rounded-full shadow-sm"></div>
                  <div className="bg-background/95 backdrop-blur-md border border-border px-3 py-2 rounded-lg shadow-xl text-center transform scale-0 group-hover:scale-100 transition-all origin-top duration-200 absolute top-[1.5rem] w-[130px]">
                    <div className="text-[11px] font-mono-custom font-bold text-foreground mb-1">Product Strategy</div>
                    <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground font-medium">
                      <MapPin size={10} /> ~1.2km
                      <span className="text-border">•</span>
                      <Shield size={10} className="text-primary" /> Protected
                    </div>
                  </div>
                </div>
                
                {/* HUD Overlays */}
                <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20">
                  <div className="flex items-center gap-2 text-xs font-mono-custom text-foreground bg-background/95 backdrop-blur border border-border px-3 py-1.5 rounded shadow-sm font-bold">
                    <Activity size={14} className="text-muted-foreground" />
                    Accuracy Band: {state.locationAccuracy ? `~${Math.round(state.locationAccuracy)}m` : 'Calibrating...'}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono-custom text-primary bg-primary/10 backdrop-blur border border-primary/20 px-3 py-1.5 rounded shadow-sm font-bold">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                    2 Signals Detected
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Signals List Panel */}
        <div className="flex flex-col gap-4 bg-background border border-border rounded-xl p-5 shadow-sm h-[400px] lg:h-auto overflow-y-auto">
          <div className="flex items-center justify-between mb-2 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <h2 className="font-bold text-lg text-foreground">Active Signals</h2>
            </div>
            <span className="text-[10px] font-mono-custom font-bold text-muted-foreground bg-secondary px-2 py-1 rounded border border-border/50 uppercase tracking-wider" data-testid="badge-demo-data">Demo Data</span>
          </div>

          {state.locationTracking !== 'tracking' ? (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-xl bg-secondary/20 my-auto">
              <ShieldAlert size={24} className="mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">Signals will populate here when scanner is active.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Signal Card 1 */}
              <div className="bg-background border border-border p-4 rounded-xl hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group" data-testid="card-signal-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded border border-primary/10">
                    <Shield size={12} className="text-primary" />
                    <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-primary">Protected</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono-custom font-bold flex items-center gap-1">
                    <MapPin size={12} /> ~800m
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors text-[15px]">Engineering Leadership</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-medium leading-relaxed">
                  Exploring utility-scale infrastructure roles. Strong background in distributed systems and high-throughput energy grid integrations.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">Rust</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">Kubernetes</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">Infra</span>
                </div>
              </div>

              {/* Signal Card 2 */}
              <div className="bg-background border border-border p-4 rounded-xl hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group" data-testid="card-signal-2">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded border border-primary/10">
                    <Shield size={12} className="text-primary" />
                    <span className="text-[10px] font-mono-custom uppercase tracking-wider font-bold text-primary">Protected</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono-custom font-bold flex items-center gap-1">
                    <MapPin size={12} /> ~1.2km
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors text-[15px]">Product Strategy</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 font-medium leading-relaxed">
                  Seeking early-stage technical co-founder for a B2B fintech venture. Deep domain expertise in payment processing and compliance.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">GTM</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">Fintech</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-foreground rounded font-mono-custom font-semibold border border-border/50">Strategy</span>
                </div>
              </div>

              {state.plan === 'free' && (
                <div className="mt-6 p-4 bg-secondary border border-border rounded-xl flex items-center justify-between shadow-inner" data-testid="card-upgrade-prompt">
                  <div className="text-sm font-bold text-foreground">Advanced routing locked.</div>
                  <Link href="/plans" className="text-xs font-bold bg-foreground text-background px-4 py-2 rounded hover:bg-foreground/90 transition-colors shadow-sm" data-testid="button-upgrade">
                    Unlock Premium
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
