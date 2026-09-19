import { useEffect, useState } from 'react';
import { Link } from 'wouter';

type Consents = { terms: boolean; privacy: boolean; age18: boolean; location: boolean; analytics: boolean; aiProfiling: boolean; marketing: boolean };
const defaults: Consents = { terms: false, privacy: false, age18: false, location: false, analytics: false, aiProfiling: false, marketing: false };

export default function PrivacyCenter() {
  const [consents, setConsents] = useState(defaults);
  const [status, setStatus] = useState('');
  useEffect(() => { fetch('/api/privacy/consents', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(data => data && setConsents({ ...defaults, ...data })).catch(() => undefined); }, []);
  const update = async (next: Consents) => {
    setConsents(next); setStatus('Saving…');
    try { const r = await fetch('/api/privacy/consents', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); setStatus(r.ok ? 'Saved' : 'Unable to save'); } catch { setStatus('Unable to save'); }
  };
  const request = async (type: 'access_export' | 'deletion') => {
    setStatus('Submitting request…');
    try { const r = await fetch('/api/privacy/requests', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) }); setStatus(r.ok ? 'Request submitted' : 'Unable to submit request'); } catch { setStatus('Unable to submit request'); }
  };
  const exportData = async () => { const r = await fetch('/api/privacy/export', { credentials: 'include' }); if (!r.ok) { setStatus('Unable to prepare export'); return; } const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'xsect-data-export.json'; a.click(); URL.revokeObjectURL(a.href); };
  const toggle = (key: keyof Consents) => update({ ...consents, [key]: !consents[key] });
  return <div className="min-h-[100dvh] bg-background"><header className="border-b border-border bg-white px-6 py-4"><Link href="/" className="font-bold tracking-[.18em]">XSECT</Link></header>
    <main className="mx-auto max-w-3xl px-6 py-10"><h1 className="text-3xl font-bold">Privacy Center</h1><p className="mt-3 text-muted-foreground">Manage your choices and data requests. Optional processing is off until you choose it.</p>
      <section className="mt-8 rounded-xl border border-border bg-white p-6"><h2 className="text-xl font-bold">Required agreements</h2>{(['terms','privacy','age18'] as const).map(k => <label key={k} className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={consents[k]} onChange={() => toggle(k)} />{k === 'terms' ? 'I agree to the Terms of Service' : k === 'privacy' ? 'I acknowledge the Privacy Notice' : 'I confirm I am 18 or older'}</label>)}</section>
      <section className="mt-5 rounded-xl border border-border bg-white p-6"><h2 className="text-xl font-bold">Optional choices</h2><p className="mt-2 text-sm text-muted-foreground">Location means foreground, approximate location while the app is open. XSECT does not currently use native background location.</p>{(['location','analytics','aiProfiling','marketing'] as const).map(k => <label key={k} className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={consents[k]} onChange={() => toggle(k)} />{k === 'location' ? 'Use approximate location while XSECT is open' : k === 'analytics' ? 'Help improve XSECT with analytics' : k === 'aiProfiling' ? 'Use my activity for AI-powered matching' : 'Receive product and opportunity updates'}</label>)}</section>
      <section className="mt-5 rounded-xl border border-border bg-white p-6"><h2 className="text-xl font-bold">Your rights</h2><p className="mt-2 text-sm text-muted-foreground">Depending on where you live, India’s DPDP Act, EU GDPR/ePrivacy rules, and US state privacy laws may give you rights to access, correct, delete, export, or object to processing. We explain these in plain language and make no claim of legal certification.</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => request('access_export')} className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold">Request my data</button><button onClick={exportData} className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold">Download export</button><button onClick={() => request('deletion')} className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive">Request deletion</button></div></section>
      {status && <p className="mt-4 text-sm text-muted-foreground" role="status">{status}</p>}<p className="mt-8 text-sm"><Link href="/privacy" className="text-primary">Privacy Notice</Link> · <Link href="/terms" className="text-primary">Terms</Link></p>
    </main></div>;
}