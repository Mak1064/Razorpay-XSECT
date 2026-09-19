import { useStore } from '../store';
import { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Workflow, Lock } from 'lucide-react';
import { Link } from 'wouter';

const intelligenceQueries = [
  "Are there emerging clusters of frontend engineers near me?",
  "Show me paths to Series A founders looking for technical co-founders.",
  "What's the current demand signal for Go vs Rust in my area?",
  "Find intersections where my skills match their immediate intent."
];

export default function Intelligence() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string|null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isProPlus = state.plan === 'pro_plus';

  const handleQuery = (q: string) => {
    if (!isProPlus) return;
    setQuery(q);
    setIsProcessing(true);
    setResponse(null);
    setTimeout(() => {
      setIsProcessing(false);
      setResponse("Based on your network orbit, I found 4 meaningful intersections regarding enterprise solar companies. Two of them share a trusted node with you. The strongest timing signal is a VP of Product who recently updated their intent to 'exploring utility-scale distribution.'");
    }, 1500);
  };

  if (!isProPlus) {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-8 relative">
          <div className="absolute top-0 right-0 w-8 h-8 bg-background border-4 border-background rounded-full flex items-center justify-center -translate-y-2 translate-x-2">
            <Lock size={14} className="text-muted-foreground" />
          </div>
          <Sparkles size={40} className="text-foreground relative z-10" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Read between the signals.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-12 text-balance leading-relaxed">
          XSECT Intelligence connects the dots your radar can't show at a glance. Surface hidden clusters, emerging themes, and the most useful paths through your network.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 mb-12 max-w-3xl w-full text-left">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <Sparkles className="text-accent mb-4" size={24}/>
            <h3 className="font-bold mb-2 text-foreground">Pattern Recognition</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Ask natural questions about the shape of your network orbit.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <ShieldCheck className="text-primary mb-4" size={24}/>
            <h3 className="font-bold mb-2 text-foreground">Zero Exposure</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">AI answers maintain strict privacy boundaries until consent.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
            <Workflow className="text-foreground mb-4" size={24}/>
            <h3 className="font-bold mb-2 text-foreground">Timing Edge</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Detect shifts in intent before they become obvious.</p>
          </div>
        </div>

        <Link href="/plans" className="px-8 py-4 bg-foreground text-background rounded-md font-bold hover:bg-foreground/90 transition-all flex items-center gap-2">
          Unlock Pro+ Intelligence <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto h-full flex flex-col">
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
          <span className="font-mono-custom text-xs font-semibold uppercase tracking-widest text-accent">Signal Layer</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">What do you want to know?</h1>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl">
        <div className="relative mb-8">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about themes, clusters, or specific paths in your network..."
            className="w-full bg-white border border-border rounded-2xl p-6 pb-16 text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none shadow-sm"
            rows={4}
          />
          <button 
            onClick={() => handleQuery(query)}
            disabled={!query || isProcessing}
            className="absolute bottom-4 right-4 bg-foreground text-background px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            {isProcessing ? 'Reading Signal...' : 'Ask AI'} <ArrowRight size={16}/>
          </button>
        </div>

        {!response && !isProcessing && (
          <div className="grid gap-3 fade-in">
            <span className="font-mono-custom font-semibold text-xs uppercase text-muted-foreground mb-2">Suggested Queries</span>
            {intelligenceQueries.map((q,i) => (
              <button key={i} onClick={() => handleQuery(q)} className="text-left p-4 rounded-xl bg-white border border-border hover:border-primary/50 transition-colors text-sm text-foreground shadow-sm">
                {q}
              </button>
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="flex-1 flex items-center justify-center fade-in">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Sparkles size={32} className="animate-[pulse_1.5s_ease-in-out_infinite] text-primary" />
              <div className="font-mono-custom text-xs font-medium uppercase tracking-widest animate-pulse">Scanning orbit...</div>
            </div>
          </div>
        )}

        {response && (
          <div className="bg-white border border-border shadow-sm rounded-2xl p-8 fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="flex items-start gap-4">
              <Sparkles className="text-primary shrink-0 mt-1" size={20} />
              <div>
                <p className="text-lg leading-relaxed text-foreground mb-6">{response}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1.5 bg-secondary rounded-md text-xs font-mono-custom font-medium">4 Intersections</span>
                  <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-mono-custom font-medium">Active Timing</span>
                  <button className="px-4 py-1.5 bg-foreground text-background rounded-md text-xs font-medium ml-auto hover:bg-foreground/90 transition-colors">
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
