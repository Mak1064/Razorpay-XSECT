import { useState } from 'react';
import { Clock3, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { useMissed, useMissedAction, useXsects } from '../hooks/use-xsects';

const tabs = ['Active', 'Missed', 'Requested', 'Connected', 'Dismissed'] as const;
const bands: Record<string, string> = { lt_250m: '<250m', '250m_500m': '250–500m', '500m_1km': '500m–1km', '1km_2km': '1–2km', '2km_5km': '2–5km', '5km_plus': '5km+' };
const ago = (value:string) => { const hours=Math.floor((Date.now()-new Date(value).getTime())/3_600_000); return hours < 1 ? 'just now' : hours < 24 ? `${hours}h ago` : `${Math.floor(hours/24)}d ago`; };
export default function XSECTs() {
  const [tab,setTab]=useState<typeof tabs[number]>('Active');
  const status=tab.toLowerCase();
  const xsects=useXsects({status:tab==='Missed'?undefined:status});
  const missed=useMissed();
  const request=useMissedAction('request'); const dismiss=useMissedAction('dismiss');
  const loading=tab==='Missed'?missed.isLoading:xsects.isLoading;
  return <div className="p-6 md:p-10 max-w-6xl mx-auto">
    <header className="mb-8"><p className="text-xs font-mono-custom uppercase text-primary tracking-widest">Opportunity journal</p><h1 className="text-3xl md:text-4xl font-bold mt-2">Your XSECTs</h1><p className="text-sm text-muted-foreground mt-2">Current, requested and almost-encountered professional intersections.</p></header>
    <nav className="flex gap-1 overflow-x-auto border-b mb-7">{tabs.map((item)=><button key={item} onClick={()=>setTab(item)} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab===item?'border-primary text-primary':'border-transparent text-muted-foreground'}`}>{item}</button>)}</nav>
    {loading && <p className="p-8 text-muted-foreground">Loading XSECTs…</p>}
    {tab==='Missed' ? <>
      {missed.data?.limited && <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm">Free plans include the last 7 days of Missed history. <Link href="/plans" className="font-bold text-primary">Unlock full history</Link></div>}
      {!missed.isLoading && !missed.data?.missed.length && <Empty label="No Missed XSECTs yet. Physical crossings with relevant professionals will appear here."/>}
      <div className="space-y-4">{missed.data?.missed.map((item)=><article key={item.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-4"><div><p className="text-xs font-mono-custom uppercase text-primary">You crossed paths</p><h2 className="font-bold mt-2">{item.counterpart?.handle ?? 'Protected professional'}</h2><p className="text-sm text-muted-foreground mt-1"><MapPin size={13} className="inline"/> {item.area ?? item.city ?? 'Approximate area'} · {bands[item.distanceBand]} · {ago(item.occurredAt)}</p></div><span className="text-2xl font-bold text-primary">{item.score}</span></div><div className="flex items-center gap-2 mt-4"><span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize">{item.status}</span>{item.status==='active' && <><button onClick={()=>request.mutate(item.id)} className="ml-auto rounded-lg bg-foreground text-background px-3 py-2 text-xs font-semibold">Request XSECT</button><button onClick={()=>dismiss.mutate(item.id)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Dismiss</button></>}</div></article>)}</div>
    </> : <>
      {xsects.data?.limited && <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm">Your free plan shows 5 active XSECTs. <Link href="/plans" className="font-bold text-primary">View plans</Link></div>}
      {!xsects.isLoading && !xsects.data?.xsects.length && <Empty label={`No ${tab.toLowerCase()} XSECTs. Keep your Wants, Offers and availability current.`}/>}
      <div className="grid md:grid-cols-2 gap-4">{xsects.data?.xsects.map((item)=><article key={item.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between"><p className="text-xs font-mono-custom uppercase text-primary">{item.type} XSECT</p><strong className="text-primary">{item.score}</strong></div><h2 className="font-bold mt-2">{item.counterpart?.handle ?? 'Protected opportunity'}</h2><p className="text-sm text-muted-foreground mt-1">{item.counterpart?.intentSummary}</p><p className="text-sm mt-4">{item.explanation[0]}</p><p className="text-xs text-muted-foreground mt-4"><Clock3 size={12} className="inline"/> {ago(item.createdAt)}</p></article>)}</div>
    </>}
  </div>;
}
function Empty({label}:{label:string}) { return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{label} <Link href="/profile" className="text-primary font-semibold">Add Wants/Offers</Link></div>; }