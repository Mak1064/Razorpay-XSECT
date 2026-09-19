import { useStore } from '../store';
import { intelligenceQueries } from '../lib/data';
import { useState } from 'react';
import { Bot, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function Intelligence() {
  const { state, upgradeToPremium } = useStore();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string|null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuery = (q: string) => {
    setQuery(q);
    setIsProcessing(true);
    setResponse(null);
    setTimeout(() => {
      setIsProcessing(false);
      setResponse("Based on your network orbit, I found 4 meaningful intersections regarding enterprise solar companies. Two of them share a trusted node with you. The strongest timing signal is a VP of Product who recently updated their intent to 'exploring utility-scale distribution.'");
    }, 1500);
  };

  if (!state.hasUpgraded) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto reveal flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-background/50 rounded-full blur-md"></div>
          <Bot size={40} className="text-foreground relative z-10" />
        </div>
        
        <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-6">Read between the signals.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12 text-balance">
          XSECT Intelligence connects the dots your radar can't show at a glance — surfacing hidden clusters, emerging themes, and the most useful paths through your network.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 mb-12 max-w-3xl w-full text-left">
          <div className="bg-card p-6 rounded-2xl border border-border">
            <Sparkles className="text-accent mb-4" size={24}/>
            <h3 className="font-medium mb-2">Pattern Recognition</h3>
            <p className="text-sm text-muted-foreground">Ask natural questions about the shape of your network orbit.</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border">
            <ShieldCheck className="text-primary mb-4" size={24}/>
            <h3 className="font-medium mb-2">Zero Exposure</h3>
            <p className="text-sm text-muted-foreground">AI answers maintain strict privacy boundaries until consent.</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border">
            <Zap className="text-accent mb-4" size={24}/>
            <h3 className="font-medium mb-2">Timing Edge</h3>
            <p className="text-sm text-muted-foreground">Detect shifts in intent before they become obvious.</p>
          </div>
        </div>

        <button onClick={upgradeToPremium} className="px-8 py-4 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-all flex items-center gap-2">
          Unlock Demo Intelligence
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto reveal h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span className="font-mono-custom text-xs uppercase tracking-widest text-accent">Signal Layer</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">What do you want to know?</h1>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl">
        <div className="relative mb-8">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about themes, clusters, or specific paths in your network..."
            className="w-full bg-card border border-border rounded-3xl p-6 pb-16 text-lg focus:outline-none focus:border-accent/50 transition-colors resize-none"
            rows={4}
          />
          <button 
            onClick={() => handleQuery(query)}
            disabled={!query || isProcessing}
            className="absolute bottom-4 right-4 bg-accent text-accent-foreground px-6 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Reading Signal...' : 'Ask AI'} <ArrowRight size={16}/>
          </button>
        </div>

        {!response && !isProcessing && (
          <div className="grid gap-3 fade-in">
            <span className="font-mono-custom text-xs uppercase text-muted-foreground mb-2">Suggested Queries</span>
            {intelligenceQueries.map((q,i) => (
              <button key={i} onClick={() => handleQuery(q)} className="text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors text-sm text-foreground">
                {q}
              </button>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="flex-1 flex items-center justify-center fade-in">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Bot size={32} className="animate-pulse text-accent" />
              <div className="font-mono-custom text-xs uppercase tracking-widest animate-pulse">Scanning orbit...</div>
            </div>
          </div>
        )}

        {response && (
          <div className="bg-accent/10 border border-accent/20 rounded-3xl p-8 fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
            <div className="flex items-start gap-4">
              <Sparkles className="text-accent shrink-0 mt-1" size={20} />
              <div>
                <p className="text-lg leading-relaxed text-foreground mb-6">{response}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-background/50 rounded border border-white/10 text-xs font-mono-custom">4 Intersections</span>
                  <span className="px-3 py-1 bg-background/50 rounded border border-white/10 text-xs font-mono-custom text-accent">Active Timing</span>
                  <button className="px-4 py-1.5 bg-accent text-accent-foreground rounded text-xs font-medium ml-auto">
                    View Paths
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
