import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { MapPin, Crosshair, PauseCircle, PlayCircle, ShieldAlert, Navigation, Shield } from 'lucide-react';
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
        // We keep coordinates entirely in memory and only persist accuracy band to state
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
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full flex flex-col">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Local Radar</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Discover signals within your approximate area. Tracking is active only while this page is open. Exact coordinates never leave your device.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {state.locationTracking === 'idle' && (
            <button 
              onClick={startTracking}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90"
            >
              <Navigation size={16} /> Enable Location
            </button>
          )}
          {state.locationTracking === 'tracking' && (
            <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 rounded-md border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Active
              </div>
              <div className="w-px h-4 bg-border"></div>
              <button onClick={pauseTracking} className="text-muted-foreground hover:text-foreground">
                <PauseCircle size={18} />
              </button>
            </div>
          )}
          {state.locationTracking === 'paused' && (
            <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 rounded-md border border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                Paused
              </div>
              <div className="w-px h-4 bg-border"></div>
              <button onClick={startTracking} className="text-foreground hover:text-primary">
                <PlayCircle size={18} />
              </button>
            </div>
          )}
          {state.locationTracking === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <ShieldAlert size={16} /> Permission denied
              <button onClick={startTracking} className="ml-2 underline hover:text-destructive/80">Retry</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_350px] gap-8">
        {/* Radar Visualization Area */}
        <div className="bg-white border border-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[400px]">
          {state.locationTracking !== 'tracking' ? (
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <Crosshair size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Radar Offline</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {state.locationTracking === 'error' 
                  ? errorMsg || "Location access is required to discover local signals."
                  : "Enable location tracking to see approximate signals near you."}
              </p>
              {state.locationTracking !== 'error' && (
                <button onClick={startTracking} className="bg-foreground text-background px-6 py-2 rounded-md font-medium text-sm">
                  Start Radar
                </button>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-[80%] h-[80%] border border-primary/20 rounded-full"></div>
              <div className="absolute w-[50%] h-[50%] border border-primary/20 rounded-full"></div>
              <div className="absolute w-[20%] h-[20%] border border-primary/20 rounded-full"></div>
              
              <div className="absolute inset-0 radar-sweep border-r border-primary/30 rounded-full"></div>
              
              <div className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(249,87,38,0.5)] z-10"></div>
              
              {/* Demo Nodes */}
              <div className="absolute top-[30%] left-[60%] w-3 h-3 bg-foreground rounded-full">
                <div className="absolute w-12 h-12 border border-border rounded-full -top-[1.1rem] -left-[1.1rem] animate-ping opacity-20"></div>
              </div>
              <div className="absolute top-[70%] left-[30%] w-2 h-2 bg-muted-foreground rounded-full"></div>
              <div className="absolute top-[40%] left-[20%] w-3 h-3 bg-foreground rounded-full"></div>
              
              <div className="absolute bottom-4 left-4 text-xs font-mono-custom text-muted-foreground bg-white/80 backdrop-blur px-2 py-1 rounded">
                Accuracy Band: {state.locationAccuracy ? `~${Math.round(state.locationAccuracy)}m` : 'Calibrating...'}
              </div>
            </div>
          )}
        </div>

        {/* Signals List (Demo Data) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Active Signals</h2>
            <span className="text-xs font-mono-custom text-muted-foreground bg-secondary px-2 py-1 rounded">Demo Data</span>
          </div>

          {state.locationTracking !== 'tracking' ? (
            <div className="p-6 text-center border border-dashed border-border rounded-xl bg-secondary/30">
              <p className="text-sm text-muted-foreground">Signals will appear when radar is active.</p>
            </div>
          ) : (
            <>
              {/* Signal Card 1 */}
              <div className="bg-white border border-border p-4 rounded-xl hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    <span className="text-xs font-mono-custom uppercase tracking-wider font-semibold text-primary">Protected</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">~400m away</span>
                </div>
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">Engineering Leadership</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  Exploring utility-scale infrastructure roles. Strong background in distributed systems and energy grid integrations.
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-1 bg-secondary text-secondary-foreground rounded font-mono-custom">Rust</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-secondary-foreground rounded font-mono-custom">Kubernetes</span>
                </div>
              </div>

              {/* Signal Card 2 */}
              <div className="bg-white border border-border p-4 rounded-xl hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    <span className="text-xs font-mono-custom uppercase tracking-wider font-semibold text-primary">Protected</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">~1.2km away</span>
                </div>
                <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">Product Strategy</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  Seeking early-stage technical co-founder for B2B fintech venture. 
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-1 bg-secondary text-secondary-foreground rounded font-mono-custom">GTM</span>
                  <span className="text-[10px] px-2 py-1 bg-secondary text-secondary-foreground rounded font-mono-custom">Fintech</span>
                </div>
              </div>

              {state.plan === 'free' && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div className="text-sm font-medium">Advanced filtering locked.</div>
                  <Link href="/plans" className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90">
                    Upgrade
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
