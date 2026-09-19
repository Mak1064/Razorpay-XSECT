import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAreas, profileQueryKey } from '../hooks/use-profile';

type Form = {
  displayName: string; role: string; intent: string; company: string; industry: string; skills: string;
  wants: string; offers: string; opportunityCategories: string; availability: 'available_now' | 'within_month' | 'not_available';
  urgency: 'urgent' | 'soon' | 'exploring'; discoveryRadius: number; email: boolean; push: boolean;
  matches: boolean; messages: boolean; trustedConnectionsOnly: boolean; womenOnly: boolean; stealthMode: boolean;
  wantCategory: string; offerCategory: string; city: string; area: string;
};
const initial: Form = { city: '', area: '', displayName: '', role: '', intent: '', company: '', industry: '', skills: '', wants: '', offers: '', opportunityCategories: '', availability: 'not_available', urgency: 'exploring', discoveryRadius: 25, email: true, push: true, matches: true, messages: true, trustedConnectionsOnly: false, womenOnly: false, stealthMode: false, wantCategory: 'service', offerCategory: 'expertise' };
const split = (value: string) => value.split(',').map(s => s.trim()).filter(Boolean);

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const areas = useAreas();
  const cities = [...new Set((areas.data?.areas ?? []).map(a => a.city))];
  const [form, setForm] = useState<Form>({ ...initial, displayName: user?.fullName || '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/profile').then(r => r.ok ? r.json() : null).then(data => { if (data?.profile) { const p = data.profile; setForm(f => ({ ...f, displayName: p.displayName, role: p.role, intent: p.intent || '', company: p.company || '', industry: p.industry || '', skills: (p.skills || []).join(', '), wants: (p.wants || []).join(', '), offers: (p.offers || []).join(', '), opportunityCategories: (p.opportunityCategories || []).join(', '), availability: p.availability, urgency: p.urgency, discoveryRadius: p.discoveryRadius, ...p.notificationPreferences, ...p.privacy })); } }).catch(() => setError('Could not load your saved signal.')).finally(() => setLoading(false)); }, []);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }));
  const complete = async () => {
    setSaving(true); setError('');
    const body = { ...form, city: form.city || null, area: form.area || null, skills: split(form.skills), wants: split(form.wants), offers: split(form.offers), opportunityCategories: split(form.opportunityCategories), notificationPreferences: { email: form.email, push: form.push, matches: form.matches, messages: form.messages }, privacy: { trustedConnectionsOnly: form.trustedConnectionsOnly, womenOnly: form.womenOnly, stealthMode: form.stealthMode, fieldVisibility: {} }, onboardingComplete: true };
    try {
      const response = await fetch('/api/onboarding/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to save onboarding.');
      const result = await response.json(); queryClient.setQueryData(profileQueryKey, result.profile);
      const shared = { description: '', skills: split(form.skills).slice(0, 15), industry: form.industry || null, locationPreference: null, radiusKm: Math.min(form.discoveryRadius, 100), intent: form.urgency === 'urgent' ? 'urgent' : 'active', availability: form.availability, workMode: 'flexible', visibility: 'discoverable', trustRequirement: 'contact', expiresAt: null };
      const firstWant = split(form.wants)[0]; const firstOffer = split(form.offers)[0];
      for (const [path, payload] of [
        firstWant ? ['wants', { ...shared, title: `Seeking ${firstWant}`.slice(0, 120), category: form.wantCategory }] : null,
        firstOffer ? ['offers', { ...shared, title: `Offering ${firstOffer}`.slice(0, 120), category: form.offerCategory }] : null,
      ].filter(Boolean) as Array<[string, Record<string, unknown>]>) {
        const intentResponse = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!intentResponse.ok) throw new Error((await intentResponse.json()).error || `Unable to create initial ${path}.`);
      }
      setLocation('/radar');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save onboarding.'); } finally { setSaving(false); }
  };
  const input = (key: keyof Form, label: string, placeholder = '') => <label className="block text-sm font-medium">{label}<input value={String(form[key])} onChange={e => update(key, e.target.value as never)} placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 bg-background border border-border rounded-md" /></label>;
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading your saved signal…</div>;
  return <div className="min-h-[100dvh] flex flex-col bg-background"><header className="px-6 py-6 border-b border-border font-bold">XSECT</header><main className="flex-1 flex items-center justify-center p-6"><div className="w-full max-w-lg bg-white border border-border rounded-xl shadow-sm p-8">
    <div className="flex gap-2 mb-6">{[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-secondary'}`} />)}</div>
    <h1 className="text-2xl font-bold mb-2">{['Your direction.', 'The basics.', 'Your context.', 'Exchange value.', 'Your timing.', 'Your reach.', 'Your boundaries.'][step - 1]}</h1>
    <p className="text-sm text-muted-foreground mb-6">Step {step} of 7 · You can update this anytime from your profile.</p>
    <div className="space-y-4">
      {step === 1 && <>{input('opportunityCategories', 'Opportunity categories', 'Hiring, partnership, mentorship')}<p className="text-xs text-muted-foreground">Separate multiple categories with commas.</p></>}
      {step === 2 && <>{input('displayName', 'Display name', 'Jane Doe')}{input('role', 'Current role', 'Founder, designer, engineer')}</>}
      {step === 3 && <>{input('company', 'Company', 'Company or independent')}{input('industry', 'Industry', 'Climate, healthcare, technology')}{input('intent', 'Current intent', 'What are you looking for?')}</>}
      {step === 3 && <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">City<select value={form.city} onChange={e => { update('city', e.target.value as never); update('area', '' as never); }} className="mt-1.5 w-full px-3 py-2 bg-background border border-border rounded-md"><option value="">Select city</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label className="block text-sm font-medium">Area<select value={form.area} onChange={e => update('area', e.target.value as never)} disabled={!form.city} className="mt-1.5 w-full px-3 py-2 bg-background border border-border rounded-md disabled:opacity-50"><option value="">Select area</option>{(areas.data?.areas ?? []).filter(a => a.city === form.city).map(a => <option key={a.area} value={a.area}>{a.area}</option>)}</select></label><p className="col-span-2 text-xs text-muted-foreground">Your area is used for Radar and Missed XSECTs at neighbourhood level only. Exact location is never shared.</p></div>}
      {step === 4 && <>{input('skills', 'Skills', 'React, strategy, operations')} {input('wants', 'Wants — add at least one', 'Co-founder, advice, introductions')}<label className="block text-sm font-medium">Primary Want category<select value={form.wantCategory} onChange={e => update('wantCategory', e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-border rounded-md">{['job','referral','investor','cofounder','mentor','advisor','freelancer','client','partnership','introduction','advice','service'].map(x=><option key={x}>{x}</option>)}</select></label> {input('offers', 'Offers — add at least one', 'Engineering, mentoring, capital')}<label className="block text-sm font-medium">Primary Offer category<select value={form.offerCategory} onChange={e => update('offerCategory', e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-border rounded-md">{['hiring','mentoring','referrals','introductions','consulting','freelancing','investment','partnership','services','expertise','resources'].map(x=><option key={x}>{x}</option>)}</select></label><p className="text-xs text-muted-foreground">Your first Want and Offer become real opportunity signals when onboarding completes.</p></>}
      {step === 5 && <><label className="block text-sm font-medium">Availability<select value={form.availability} onChange={e => update('availability', e.target.value as Form['availability'])} className="mt-1.5 w-full px-3 py-2 border border-border rounded-md"><option value="available_now">Available now</option><option value="within_month">Within a month</option><option value="not_available">Just exploring</option></select></label><label className="block text-sm font-medium">Urgency<select value={form.urgency} onChange={e => update('urgency', e.target.value as Form['urgency'])} className="mt-1.5 w-full px-3 py-2 border border-border rounded-md"><option value="urgent">Urgent</option><option value="soon">Soon</option><option value="exploring">Exploring</option></select></label></>}
      {step === 6 && <><label className="block text-sm font-medium">Discovery radius: {form.discoveryRadius} miles<input type="range" min="1" max="500" value={form.discoveryRadius} onChange={e => update('discoveryRadius', Number(e.target.value))} className="w-full mt-3" /></label>{(['email', 'push', 'matches', 'messages'] as const).map(k => <label key={k} className="flex gap-2 text-sm"><input type="checkbox" checked={form[k]} onChange={e => update(k, e.target.checked)} /> {k === 'matches' ? 'New relevant matches' : `Notify by ${k}`}</label>)}</>}
      {step === 7 && <>{(['trustedConnectionsOnly', 'womenOnly', 'stealthMode'] as const).map(k => <label key={k} className="flex gap-2 text-sm"><input type="checkbox" checked={form[k]} onChange={e => update(k, e.target.checked)} /> {k === 'trustedConnectionsOnly' ? 'Trusted connections only' : k === 'womenOnly' ? 'Women-only opportunities (opt in)' : 'Stealth / ghost mode'}</label>)}<p className="text-xs text-muted-foreground">Review complete. Your privacy choices are saved on the server and apply across devices.</p></>}
    </div>
    {error && <p className="mt-4 text-sm text-destructive">{error}</p>}<div className="flex gap-3 mt-8">{step > 1 && <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 bg-secondary rounded-md">Back</button>}{step < 7 ? <button onClick={() => setStep(step + 1)} disabled={(step === 2 && !form.displayName) || (step === 3 && !form.city)} className="flex-1 bg-foreground text-background py-2.5 rounded-md disabled:opacity-50">Continue</button> : <button onClick={complete} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md disabled:opacity-50">{saving ? 'Saving…' : 'Save and enter XSECT'}</button>}</div>
  </div></main></div>;
}