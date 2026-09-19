import { useState } from 'react';
import { useStore } from '../store';
import { opportunities } from '../lib/data';
import { EyeOff, Unlock, ArrowRight, User } from 'lucide-react';

export default function XSECTs() {
  const { state, acceptConnection, unlockIdentity } = useStore();
  const [activeTab, setActiveTab] = useState<'pending'|'active'>('pending');

  const pendingRequests = opportunities.filter(o => state.connectionsRequested.includes(o.id) && !state.unlockedIdentities.includes(o.id));
  const activeConnections = opportunities.filter(o => state.unlockedIdentities.includes(o.id));

  // Dummy incoming request
  const incomingRequest = opportunities.find(o => o.id === 'opt_3');

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto reveal">
      <header className="mb-12 border-b border-border pb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span className="font-mono-custom text-xs uppercase tracking-widest text-accent">Archive</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Paths that crossed.</h1>
      </header>

      <div className="flex gap-4 mb-8 border-b border-white/5 pb-px">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Pending Consents
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Revealed Identities
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === 'pending' && (
          <>
            {incomingRequest && !state.unlockedIdentities.includes(incomingRequest.id) && (
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 reveal-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4"><div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div></div>
                <h3 className="font-serif text-2xl text-primary mb-2">Incoming Request</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xl">Protected Professional #{incomingRequest.id.split('_')[1]} wants to reveal identities. You share a high intent overlap.</p>
                
                <div className="flex items-center gap-4 bg-background/50 p-4 rounded-2xl mb-6 border border-white/5">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                    <img src={incomingRequest.obscuredImage} className="w-full h-full object-cover blur-[2px] opacity-80" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Protected Identity</div>
                    <div className="text-xs text-muted-foreground">Score: {incomingRequest.score}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => acceptConnection(incomingRequest.id)} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
                    Accept & Reveal
                  </button>
                  <button className="px-6 py-2.5 bg-white/5 text-foreground rounded-xl text-sm font-medium hover:bg-white/10">
                    Decline
                  </button>
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && (!incomingRequest || state.unlockedIdentities.includes(incomingRequest.id)) && (
              <div className="text-center py-20 text-muted-foreground">
                No pending requests.
              </div>
            )}

            {pendingRequests.map(req => (
              <div key={req.id} className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between reveal-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img src={req.obscuredImage} className="w-full h-full object-cover blur-sm opacity-60" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2"><EyeOff size={14}/> Protected #{req.id.split('_')[1]}</div>
                    <div className="text-xs text-muted-foreground">Waiting for their consent</div>
                  </div>
                </div>
                <div className="text-xs font-mono-custom text-accent">Pending</div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'active' && (
          <div className="grid md:grid-cols-2 gap-6 reveal-1">
            {activeConnections.length === 0 && (
              <div className="col-span-2 text-center py-20 text-muted-foreground">
                No revealed identities yet. Accept requests to uncover paths.
              </div>
            )}
            
            {activeConnections.map(conn => (
              <div key={conn.id} className="bg-card border border-border rounded-3xl overflow-hidden group">
                <div className="h-48 relative overflow-hidden">
                  <img src={conn.revealedImage} alt={conn.realName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur p-2 rounded-full border border-white/10 text-primary">
                    <Unlock size={16} />
                  </div>
                </div>
                <div className="p-6 relative -mt-12 z-10">
                  <h3 className="font-serif text-2xl text-foreground">{conn.realName}</h3>
                  <div className="text-sm text-primary mb-4">{conn.realRole} @ {conn.company}</div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-6">
                    <div className="text-xs text-muted-foreground mb-1 font-mono-custom">Original Signal</div>
                    <div className="text-sm line-clamp-2">"{conn.intent}"</div>
                  </div>
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors">
                    Send Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
