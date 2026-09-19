import { useState } from 'react';
import { Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegenerateTwin, useTwin, useUpdateTwin, type TwinSummary } from '../hooks/use-ai';

const sections: Array<{key:keyof TwinSummary;label:string}> = [
  {key:'whatYouOffer',label:'What you offer'}, {key:'whatYouWant',label:'What you want'},
  {key:'whatYouAreGoodAt',label:"What you're good at"}, {key:'whoYouShouldMeet',label:'Who you should meet'},
  {key:'opportunitiesThatFit',label:'Opportunities that fit'}, {key:'industries',label:'Industries'},
  {key:'networkingGoals',label:'Networking goals'},
];

export default function ProfessionalTwin(){
  const {data,isLoading} = useTwin(); const regenerate=useRegenerateTwin(); const update=useUpdateTwin();
  const [draft,setDraft]=useState<Partial<Record<keyof TwinSummary,string>>>({});
  const twin=data?.twin;
  const save=(key:keyof TwinSummary, values:string[])=>update.mutate({[key]:values});
  if(isLoading) return <section className="bg-white border border-border rounded-2xl p-8 text-muted-foreground">Loading your Professional Twin…</section>;
  if(!twin) return <section className="bg-white border border-border rounded-2xl p-8 shadow-sm"><Sparkles className="text-primary mb-3"/><h2 className="text-xl font-bold">Your Professional Twin</h2><p className="text-sm text-muted-foreground mt-2 mb-5">Generate a structured view of your real professional signals, Wants, Offers, skills, experience, and reviews.</p><button onClick={()=>regenerate.mutate()} disabled={regenerate.isPending} className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-bold">{regenerate.isPending?'Generating…':'Generate Professional Twin'}</button></section>;
  return <section className="bg-white border border-border rounded-2xl p-8 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><div className="flex items-center gap-2 text-primary font-mono-custom uppercase text-xs tracking-widest mb-2"><Sparkles size={14}/> Professional Twin</div><h2 className="text-2xl font-bold">Your professional signal, structured.</h2><p className="text-xs text-muted-foreground mt-2">Generated {new Date(twin.generatedAt).toLocaleString()} · {twin.model}</p></div><button onClick={()=>regenerate.mutate()} disabled={regenerate.isPending} className="px-4 py-2 border border-border rounded-lg text-sm font-bold flex items-center gap-2"><RefreshCw size={15} className={regenerate.isPending?'animate-spin':''}/>Regenerate</button></div>
    <div className="grid md:grid-cols-2 gap-6">{sections.map(({key,label})=><div key={key}><h3 className="font-mono-custom text-xs uppercase tracking-wider text-muted-foreground mb-3">{label}</h3><div className="flex flex-wrap gap-2">{twin.merged[key].map(item=><span key={item} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-sm">{item}<button aria-label={`Remove ${item}`} onClick={()=>save(key,twin.merged[key].filter(v=>v!==item))}><X size={13}/></button></span>)}</div><form className="flex gap-2 mt-3" onSubmit={e=>{e.preventDefault();const value=(draft[key]??'').trim();if(value&&!twin.merged[key].includes(value))save(key,[...twin.merged[key],value]);setDraft(d=>({...d,[key]:''}));}}><input value={draft[key]??''} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))} placeholder="Add correction" className="min-w-0 flex-1 px-3 py-2 border border-border rounded-lg text-sm"/><button className="p-2 border border-border rounded-lg" aria-label={`Add ${label}`}><Plus size={16}/></button></form></div>)}</div>
    {update.isError&&<p className="text-sm text-destructive mt-4">{update.error.message}</p>}
  </section>;
}