import { useState } from 'react';
import { MapPin, Shield, X } from 'lucide-react';
import { Link } from 'wouter';
import { ApiError, useDiscover, useDismissXsect, useRequestXsect, type Xsect } from '../hooks/use-xsects';
import OpportunityMap from '../components/OpportunityMap';

const bands: Record<string, string> = { lt_250m: '<250m', '250m_500m': '250–500m', '500m_1km': '500m–1km', '1km_2km': '1–2km', '2km_5km': '2–5km', '5km_plus': '5km+' };
export default function Discover() {
  const [filters, setFilters] = useState({ category: '', industry: '', type: '', minScore: 45 });
  const [selected, setSelected] = useState<Xsect | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const discover = useDiscover(filters); const request = useRequestXsect(); const dismiss = useDismissXsect();
  const upgrade = (request.error instanceof ApiError && request.error.status === 402) || (discover.error instanceof ApiError && discover.error.status === 402);
  return <div className="p-6 md:p-10 max-w-6xl mx-auto">
    <header className="mb-8"><p className="text-xs font-mono-custom uppercase tracking-widest text-primary">Opportunity intelligence</p><h1 className="text-3xl md:text-4xl font-bold mt-2">Discover XSECTs</h1><p className="text-sm text-muted-foreground mt-2">Relevant intersections based on your active professional signals.</p></header>
    <div className="flex gap-2 mb-6" role="tablist"><button role="tab" aria-selected={view === 'list'} onClick={() => setView('list')} className={`rounded-lg px-4 py-2 text-sm font-bold border ${view === 'list' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}>XSECTs</button><button role="tab" aria-selected={view === 'map'} onClick={() => setView('map')} className={`rounded-lg px-4 py-2 text-sm font-bold border ${view === 'map' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}>Opportunity Map</button></div>
    {view === 'map' ? <OpportunityMap /> : <>
    <div className="grid sm:grid-cols-4 gap-3 mb-7">
      <input aria-label="Category" placeholder="Category" className="rounded-lg border p-2.5 text-sm" value={filters.category} onChange={(e) => setFilters({...filters, category:e.target.value})}/>
      <input aria-label="Industry" placeholder="Industry" className="rounded-lg border p-2.5 text-sm" value={filters.industry} onChange={(e) => setFilters({...filters, industry:e.target.value})}/>
      <select aria-label="XSECT type" className="rounded-lg border p-2.5 text-sm" value={filters.type} onChange={(e) => setFilters({...filters, type:e.target.value})}><option value="">Intent + Opportunity</option><option value="intent">Intent</option><option value="opportunity">Opportunity</option></select>
      <label className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">Minimum score: {filters.minScore}<input className="w-full accent-primary" type="range" min="0" max="100" value={filters.minScore} onChange={(e) => setFilters({...filters,minScore:Number(e.target.value)})}/></label>
    </div>
    {upgrade && <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">Expanded discovery requires an upgraded plan. <Link href="/plans" className="text-primary font-bold">View plans</Link></div>}
    {discover.isLoading && <p className="p-8 text-muted-foreground">Finding meaningful XSECTs…</p>}
    {discover.isError && !upgrade && <p className="p-6 text-destructive">Discovery could not be loaded.</p>}
    {!discover.isLoading && !discover.data?.xsects.length && <div className="rounded-xl border border-dashed p-10 text-center"><h2 className="font-bold">No XSECTs meet these filters</h2><p className="text-sm text-muted-foreground mt-2">Try a lower score or add another Want or Offer.</p><Link href="/profile" className="inline-block mt-4 text-primary font-semibold">Update your profile</Link></div>}
    <div className="grid gap-4">{discover.data?.xsects.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5">
      <div className="flex gap-5"><Score value={item.score}/><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 text-xs font-mono-custom text-muted-foreground"><span className="text-primary uppercase">{item.type} XSECT</span><span><Shield size={12} className="inline"/> {item.counterpart?.trustLevel}</span>{item.distanceBand && <span><MapPin size={12} className="inline"/> {bands[item.distanceBand]}</span>}</div><h2 className="font-bold text-lg mt-2">{item.counterpart?.handle ?? 'Protected professional'}</h2><p className="text-sm text-muted-foreground">{item.counterpart?.intentSummary}</p><ul className="mt-3 text-sm space-y-1">{item.explanation.slice(0,2).map((reason) => <li key={reason}>✓ {reason}</li>)}</ul></div></div>
      <div className="flex flex-wrap gap-2 mt-5 border-t pt-4"><button onClick={() => request.mutate(item.id)} disabled={request.isPending} className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-semibold">Request XSECT</button><button onClick={() => dismiss.mutate(item.id)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Dismiss</button><button onClick={() => setSelected(item)} className="ml-auto text-sm text-primary font-semibold">Full breakdown</button></div>
    </article>)}</div>
    </>}
    {selected && <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={() => setSelected(null)}><aside className="w-full max-w-md h-full overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><button className="float-right" onClick={() => setSelected(null)}><X/></button><p className="text-xs font-mono-custom text-primary uppercase">XSECT Score</p><h2 className="text-4xl font-bold mt-2">{selected.score}</h2><h3 className="font-bold mt-8">Why this XSECT?</h3><ul className="mt-3 space-y-2 text-sm">{selected.explanation.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul><h3 className="font-bold mt-8">Factor breakdown</h3><div className="space-y-4 mt-4">{selected.factors.map((factor) => <div key={factor.factor}><div className="flex justify-between text-sm"><span className="capitalize">{factor.factor}</span><span>{factor.score}</span></div><div className="h-2 bg-secondary rounded mt-1"><div className="h-full bg-primary rounded" style={{width:`${factor.score}%`}}/></div><p className="text-xs text-muted-foreground mt-1">{factor.detail} · {factor.weight}% weight</p></div>)}</div></aside></div>}
  </div>;
}
function Score({value}:{value:number}) { return <div className="shrink-0 w-16 h-16 rounded-full border-[5px] border-primary flex flex-col items-center justify-center"><strong>{value}</strong><span className="text-[8px]">SCORE</span></div>; }