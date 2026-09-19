import { Activity, ArrowRight, Clock3, Flame, MapPin, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useRadar, type Xsect } from '../hooks/use-xsects';

const bands: Record<string, string> = { lt_250m: '<250m', '250m_500m': '250–500m', '500m_1km': '500m–1km', '1km_2km': '1–2km', '2km_5km': '2–5km', '5km_plus': '5km+' };
function MiniCard({ item }: { item: Xsect }) {
  return <Link href="/xsects" className="block rounded-xl border border-border bg-white p-4 hover:border-primary/40">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-mono-custom uppercase tracking-wider text-primary">{item.type} XSECT</p><h3 className="font-bold mt-1">{item.counterpart?.handle ?? 'Protected professional'}</h3></div><span className="font-mono-custom text-lg font-bold text-primary">{item.score}</span></div>
    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.explanation[0]}</p>
  </Link>;
}
export default function Radar() {
  const radar = useRadar();
  const data = radar.data;
  return <div className="p-6 md:p-10 max-w-6xl mx-auto">
    <header className="mb-8"><p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold">XSECT Radar</p><h1 className="text-3xl md:text-4xl font-bold mt-2">What's crossing your path?</h1><p className="text-sm text-muted-foreground mt-2">Professional intersections shaped by your real Wants, Offers, availability and network.</p></header>
    {radar.isLoading && <div className="rounded-xl border p-8 text-muted-foreground">Scanning your opportunity surface…</div>}
    {radar.isError && <div className="rounded-xl border border-destructive/30 p-6 text-destructive">Your Radar could not be loaded. Please try again.</div>}
    {data && <div className="space-y-8">
      <section className="grid sm:grid-cols-3 gap-3">
        {[{ label: 'Active XSECTs', value: data.stats.activeXsects, Icon: Activity }, { label: 'Missed this week', value: data.stats.missedThisWeek, Icon: Clock3 }, { label: 'Connections', value: data.stats.connections, Icon: Users }].map(({ label, value, Icon }) => <div key={label} className="rounded-xl border border-border bg-white p-5"><Icon className="text-primary mb-3" size={19}/><p className="text-3xl font-bold">{value}</p><p className="text-xs font-mono-custom uppercase text-muted-foreground mt-1">{label}</p></div>)}
      </section>
      <section><div className="flex items-center gap-2 mb-4"><Flame className="text-primary" size={20}/><h2 className="text-xl font-bold">Hot XSECTs</h2></div>
        {data.hotXsects.length ? <div className="grid md:grid-cols-2 gap-4">{data.hotXsects.map((item) => <MiniCard key={item.id} item={item}/>)}</div> : <Empty text="Your Radar is quiet. Add another Want or Offer to increase your opportunity surface."/>}
      </section>
      <section><div className="flex items-center gap-2 mb-4"><MapPin className="text-primary" size={20}/><h2 className="text-xl font-bold">Near you</h2></div>
        {Object.values(data.nearby).some((items) => items.length) ? <div className="grid md:grid-cols-3 gap-4">{Object.entries(data.nearby).filter(([, items]) => items.length).map(([band, items]) => <div key={band} className="rounded-xl border bg-white p-4"><p className="font-mono-custom text-xs text-primary">{bands[band] ?? band}</p><p className="text-2xl font-bold mt-2">{items.length}</p><p className="text-sm text-muted-foreground">physical XSECT{items.length === 1 ? '' : 's'} today</p></div>)}</div> : <Empty text="Nothing relevant is crossing your path right now. Keep your Wants and Offers current."/>}
      </section>
      <section><div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Moments</h2><Link href="/xsects" className="text-sm text-primary font-semibold">View all <ArrowRight size={14} className="inline"/></Link></div>
        {data.moments.length ? <div className="rounded-xl border bg-white divide-y">{data.moments.map((moment) => <div key={moment.id} className={`p-4 ${moment.readAt ? '' : 'bg-primary/[0.03]'}`}><p className="font-semibold">{moment.title}</p><p className="text-sm text-muted-foreground mt-1">{moment.body}</p><p className="text-xs text-muted-foreground mt-2">{new Date(moment.createdAt).toLocaleString()}</p></div>)}</div> : <Empty text="Moments appear when meaningful professional signals intersect."/ >}
      </section>
    </div>}
  </div>;
}
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed bg-secondary/20 p-7 text-sm text-muted-foreground">{text} <Link href="/profile" className="text-primary font-semibold ml-1">Add Wants/Offers</Link></div>; }