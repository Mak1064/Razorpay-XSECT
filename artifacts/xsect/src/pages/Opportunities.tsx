import { useState } from 'react';
import { BriefcaseBusiness, HandHeart, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type IntentInput, type IntentKind, type OpportunityIntent, useIntentActions, useIntents } from '../hooks/use-opportunities';

const categories = {
  wants: ['job', 'referral', 'investor', 'cofounder', 'mentor', 'advisor', 'freelancer', 'client', 'partnership', 'introduction', 'advice', 'service'],
  offers: ['hiring', 'mentoring', 'referrals', 'introductions', 'consulting', 'freelancing', 'investment', 'partnership', 'services', 'expertise', 'resources'],
};
const blank = (kind: IntentKind): IntentInput => ({ title: '', description: '', category: categories[kind][0], skills: [], industry: null, locationPreference: null, radiusKm: 25, intent: 'active', availability: 'flexible', workMode: 'flexible', visibility: 'discoverable', trustRequirement: 'contact', expiresAt: null });
const dateValue = (value: string | null) => value ? value.slice(0, 10) : '';

function IntentDialog({ kind, current, close }: { kind: IntentKind; current?: OpportunityIntent; close: () => void }) {
  const actions = useIntentActions(kind); const { toast } = useToast();
  const [form, setForm] = useState<IntentInput>(current ? { ...current, expiresAt: current.expiresAt } : blank(kind));
  const [skills, setSkills] = useState(form.skills.join(', '));
  const set = <K extends keyof IntentInput>(key: K, value: IntentInput[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  const save = async () => {
    try {
      const input = { ...form, skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean), expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null };
      if (current) await actions.update.mutateAsync({ id: current.id, input }); else await actions.create.mutateAsync(input);
      toast({ title: `${kind === 'wants' ? 'Want' : 'Offer'} saved`, description: 'Your opportunity surface has been updated.' }); close();
    } catch (error) { toast({ title: 'Unable to save', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }); }
  };
  const field = (label: string, key: 'title' | 'industry' | 'locationPreference' | 'availability') => <label className="text-sm font-medium">{label}<input value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value || (key === 'industry' || key === 'locationPreference' ? null : '') as never)} className="mt-1 w-full border border-border rounded-lg px-3 py-2" /></label>;
  return <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"><div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
    <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold">{current ? 'Edit' : 'Create'} {kind === 'wants' ? 'Want' : 'Offer'}</h2><button onClick={close} aria-label="Close"><X /></button></div>
    <div className="grid md:grid-cols-2 gap-4">{field('Title', 'title')}<label className="text-sm font-medium">Category<select value={form.category} onChange={(e) => set('category', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">{categories[kind].map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="md:col-span-2 text-sm font-medium">Description<textarea value={form.description} maxLength={1000} onChange={(e) => set('description', e.target.value)} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium">Skills (up to 15, comma-separated)<input value={skills} onChange={(e) => setSkills(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
      {field('Industry', 'industry')}{field('Location preference', 'locationPreference')}
      <label className="text-sm font-medium">Radius (km)<input type="number" min={1} max={100} value={form.radiusKm} onChange={(e) => set('radiusKm', Number(e.target.value))} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
      <label className="text-sm font-medium">Intent<select value={form.intent} onChange={(e) => set('intent', e.target.value as IntentInput['intent'])} className="mt-1 w-full border rounded-lg px-3 py-2"><option value="casual">Casual</option><option value="active">Active</option><option value="urgent">Urgent</option></select></label>
      {field('Availability', 'availability')}
      <label className="text-sm font-medium">Work mode<select value={form.workMode} onChange={(e) => set('workMode', e.target.value as IntentInput['workMode'])} className="mt-1 w-full border rounded-lg px-3 py-2">{['flexible', 'remote', 'hybrid', 'in_person'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></label>
      <label className="text-sm font-medium">Visibility<select value={form.visibility} onChange={(e) => set('visibility', e.target.value as IntentInput['visibility'])} className="mt-1 w-full border rounded-lg px-3 py-2">{['discoverable', 'trusted_only', 'hidden'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Minimum trust<select value={form.trustRequirement} onChange={(e) => set('trustRequirement', e.target.value as IntentInput['trustRequirement'])} className="mt-1 w-full border rounded-lg px-3 py-2">{['contact', 'professional', 'enhanced'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm font-medium">Expires<input type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={dateValue(form.expiresAt)} onChange={(e) => set('expiresAt', e.target.value || null)} className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
    </div><button onClick={save} disabled={actions.create.isPending || actions.update.isPending} className="mt-6 w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-lg disabled:opacity-50">Save {kind === 'wants' ? 'Want' : 'Offer'}</button>
  </div></div>;
}

function IntentColumn({ kind }: { kind: IntentKind }) {
  const query = useIntents(kind); const actions = useIntentActions(kind); const { toast } = useToast();
  const [dialog, setDialog] = useState<OpportunityIntent | null | undefined>(undefined);
  const rows = (kind === 'wants' ? query.data?.wants : query.data?.offers) ?? [];
  const status = async (row: OpportunityIntent, next: 'active' | 'paused' | 'fulfilled') => { try { await actions.status.mutateAsync({ id: row.id, status: next }); } catch (error) { toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }); } };
  return <section><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2">{kind === 'wants' ? <BriefcaseBusiness className="text-primary" /> : <HandHeart className="text-primary" />}<h2 className="text-xl font-bold">{kind === 'wants' ? 'Wants' : 'Offers'}</h2></div><button onClick={() => setDialog(null)} className="bg-foreground text-background rounded-lg px-3 py-2 text-sm font-bold flex gap-1.5"><Plus size={16} />Add</button></div>
    {query.isLoading ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? <div className="bg-white border border-dashed rounded-xl p-8 text-center"><p className="font-bold">No active signal yet</p><p className="text-sm text-muted-foreground mt-1">Create a {kind === 'wants' ? 'Want' : 'Offer'} to increase your opportunity surface.</p></div> :
      <div className="space-y-3">{rows.map((row) => <article key={row.id} className="bg-white border border-border rounded-xl p-5 shadow-sm">
        <div className="flex justify-between gap-3"><div><div className="flex gap-2 flex-wrap mb-2"><span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-1">{row.category}</span><span className="text-xs bg-secondary rounded-full px-2 py-1">{row.intent}</span><span className="text-xs border rounded-full px-2 py-1">{row.status}</span></div><h3 className="font-bold">{row.title}</h3></div><button onClick={() => setDialog(row)}><Pencil size={16} /></button></div>
        {row.description && <p className="text-sm text-muted-foreground mt-2">{row.description}</p>}<p className="text-xs text-muted-foreground mt-3">{row.expiresAt ? `Expires ${new Date(row.expiresAt).toLocaleDateString()}` : 'No expiry'} · {row.radiusKm} km · {row.workMode.replace('_', ' ')}</p>
        <div className="flex flex-wrap gap-2 mt-4">{row.status !== 'paused' && <button onClick={() => status(row, 'paused')} className="text-xs border rounded-md px-2.5 py-1.5">Pause</button>}{row.status === 'paused' && <button onClick={() => status(row, 'active')} className="text-xs border rounded-md px-2.5 py-1.5">Activate</button>}{row.status !== 'fulfilled' && <button onClick={() => status(row, 'fulfilled')} className="text-xs border rounded-md px-2.5 py-1.5">Fulfil</button>}<button onClick={async () => { if (confirm('Delete this opportunity?')) await actions.remove.mutateAsync(row.id); }} className="text-xs text-destructive ml-auto flex gap-1 items-center"><Trash2 size={14} />Delete</button></div>
      </article>)}</div>}
    {dialog !== undefined && <IntentDialog kind={kind} current={dialog ?? undefined} close={() => setDialog(undefined)} />}
  </section>;
}
export default function Opportunities() {
  return <div className="p-6 md:p-10 max-w-6xl mx-auto"><header className="mb-10"><p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">Opportunity signals</p><h1 className="text-4xl font-bold tracking-tight">Wants & Offers</h1><p className="text-sm text-muted-foreground mt-2">Keep your professional intent current so XSECT can detect relevant intersections.</p></header><div className="grid lg:grid-cols-2 gap-8"><IntentColumn kind="wants" /><IntentColumn kind="offers" /></div></div>;
}