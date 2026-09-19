import { useState } from 'react';
import { ArrowRight, Network, ShieldCheck, Sparkles, X } from 'lucide-react';
import { usePathHistory, usePathSearch, useRequestBridge, type XsectPath } from '../hooks/use-network';

export default function Paths() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [bridgePath, setBridgePath] = useState<XsectPath | null>(null);
  const [reason, setReason] = useState('');
  const search = usePathSearch(query);
  const history = usePathHistory();
  const bridge = useRequestBridge();
  const requestBridge = () => {
    if (!bridgePath || bridgePath.steps.length < 2) return;
    bridge.mutate({ pathId: bridgePath.id, intermediaryId: bridgePath.steps[0].userId, targetUserId: bridgePath.targetUserId!, reason }, { onSuccess: () => { setBridgePath(null); setReason(''); } });
  };
  return <div className="p-6 md:p-10 max-w-6xl mx-auto">
    <header className="mb-8"><p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">XSECT Paths</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight">Find the path to an opportunity</h1><p className="text-sm text-muted-foreground mt-2">Search the accepted-connection graph without exposing private identities.</p></header>
    <form className="bg-white border border-border rounded-2xl p-4 flex gap-3 shadow-sm" onSubmit={(event) => { event.preventDefault(); setQuery(input.trim()); }}>
      <input className="flex-1 min-w-0 rounded-lg border border-border px-4 py-3 text-sm" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Who do you want to reach?" aria-label="Who do you want to reach?" />
      <button className="rounded-lg bg-foreground text-background px-5 text-sm font-bold">Find Paths</button>
    </form>
    {search.isLoading && <p className="py-8 text-sm text-muted-foreground">Searching verified Paths…</p>}
    {search.isError && <p className="py-8 text-sm text-destructive">{search.error.message}</p>}
    {query && !search.isLoading && !search.data?.paths.length && !search.isError && <Empty />}
    <div className="grid gap-4 mt-8">{search.data?.paths.map((path) => <PathCard key={path.id} path={path} onBridge={() => setBridgePath(path)} />)}</div>
    <section className="mt-12"><h2 className="text-lg font-bold border-b pb-3">Path history</h2><div className="divide-y">{history.data?.paths.slice(0, 10).map((path) => <div key={path.id} className="py-4 flex justify-between gap-4"><div><p className="font-semibold text-sm">{path.query}</p><p className="text-xs text-muted-foreground">{path.stepCount} step{path.stepCount === 1 ? '' : 's'} · {new Date(path.createdAt).toLocaleDateString()}</p></div><span className="text-xs font-mono-custom">{path.relevance} relevance</span></div>)}</div>{history.data?.paths.length === 0 && <p className="py-6 text-sm text-muted-foreground">Your searched Paths will appear here.</p>}</section>
    {bridgePath && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border max-w-lg w-full p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-bold">Request Bridge introduction</h2><button onClick={() => setBridgePath(null)}><X size={18} /></button></div><p className="text-sm text-muted-foreground mt-2">Tell your intermediary why this introduction would be useful.</p><textarea className="w-full min-h-32 border rounded-lg p-3 mt-4 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for the introduction (10–500 characters)" maxLength={500} /><button disabled={reason.trim().length < 10 || bridge.isPending} onClick={requestBridge} className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-bold disabled:opacity-50">{bridge.isPending ? 'Requesting…' : 'Send Bridge request'}</button>{bridge.isError && <p className="text-xs text-destructive mt-2">{bridge.error.message}</p>}</div></div>}
  </div>;
}
function PathCard({ path, onBridge }: { path: XsectPath; onBridge: () => void }) {
  return <article className="bg-white border border-border rounded-2xl p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-mono-custom uppercase text-primary">{path.stepCount}-step XSECT</p><p className="text-sm text-muted-foreground mt-1">{path.explanation}</p></div><div className="flex gap-2"><Chip>{path.strength} strength</Chip><Chip>{path.trust} trust</Chip></div></div><div className="flex flex-wrap items-center gap-2 my-5"><span className="font-bold text-sm">You</span>{path.steps.map((step) => <span key={step.userId} className="contents"><ArrowRight size={15} className="text-muted-foreground" /><span className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm"><span className="flex items-center gap-1.5 font-semibold">{!step.revealed && <ShieldCheck size={13} />} {step.label}</span><span className="text-[10px] text-muted-foreground">{step.relationshipStrength} relationship</span></span></span>)}</div><div className="flex items-center justify-between"><span className="text-sm font-bold text-primary">XSECT relevance {path.relevance}</span>{path.stepCount >= 2 && <button onClick={onBridge} className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-bold">Request Bridge introduction</button>}</div></article>;
}
const Chip = ({ children }: { children: React.ReactNode }) => <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase font-mono-custom">{children}</span>;
function Empty() { return <div className="mt-8 border border-dashed rounded-2xl p-10 text-center"><Network className="mx-auto text-muted-foreground mb-3" /><p className="font-bold">We couldn't find a direct Path yet.</p><p className="text-sm text-muted-foreground mt-1"><Sparkles size={13} className="inline mr-1" />Try a role, skill, industry, Offer, or organization name.</p></div>; }
