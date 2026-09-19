import { Layers3, Save } from 'lucide-react';
import { useStore } from '../store';

export default function XSECTs() {
  const { state } = useStore();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Archive</h1>
        <p className="text-muted-foreground text-sm max-w-lg">
          Opportunities and signals you've saved for later.
        </p>
      </header>

      {state.savedOpportunities.length === 0 ? (
        <div className="text-center py-20 bg-white border border-border rounded-2xl shadow-sm">
          <Layers3 size={48} className="text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No saved signals</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            When you see an interesting opportunity on Radar or Discover, save it here to review later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="bg-white border border-border p-5 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground mb-1">Director of Engineering</h3>
              <p className="text-sm text-muted-foreground font-medium">Saved 2 days ago</p>
            </div>
            <button className="px-4 py-2 bg-secondary text-foreground text-sm font-bold rounded-lg hover:bg-secondary/80">
              View Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
