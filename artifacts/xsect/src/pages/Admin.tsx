import { useState } from 'react';
import { useUser } from '@clerk/react';
import { BarChart3, RefreshCw, Search, Shield, Users, Zap } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  type AdminUser, type Plan, useAdminAction, useAdminAreas, useAdminEvents, useAdminFunnel,
  useAdminMe, useAdminOverview, useAdminOverrides, useAdmins, useAdminUser, useAdminUsers, useBootstrapAdmin,
} from '../hooks/use-admin';

const tabs = ['Overview', 'Simulation', 'Users', 'Plans', 'Analytics', 'Admins'] as const;
type Tab = typeof tabs[number];
const inputClass = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50';
const distanceBands = ['lt_250m', '250m_500m', '500m_1km', '1km_2km', '2km_5km', '5km_plus'] as const;

function Card({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><p className="text-xs font-mono-custom uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
function Notice({ message, error }: { message?: string; error?: unknown }) {
  if (!message && !error) return null;
  return <p className={`mt-3 rounded-lg p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-800'}`}>{error instanceof Error ? error.message : message}</p>;
}

export default function Admin() {
  const me = useAdminMe();
  const bootstrap = useBootstrapAdmin();
  const [tab, setTab] = useState<Tab>('Overview');
  if (me.isLoading) return <div className="p-10 text-sm text-muted-foreground">Checking administrator access…</div>;
  if (!me.data?.isAdmin) return <div className="p-6 md:p-10 max-w-2xl mx-auto">
    <div className="rounded-2xl border border-border bg-white p-8">
      <Shield className="text-primary mb-4" />
      <h1 className="text-3xl font-bold">Administrator access</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This workspace has no public administrator tools. If no administrator has been registered yet, the first operator can claim access below. Once claimed, future administrators must be added by an existing administrator.</p>
      <button className={`${buttonClass} mt-6`} disabled={bootstrap.isPending} onClick={() => bootstrap.mutate()}>Claim admin access</button>
      <Notice error={bootstrap.error ?? me.error} />
    </div>
  </div>;
  return <div className="p-6 md:p-10 max-w-7xl mx-auto">
    <header className="mb-8">
      <p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">Operations console</p>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">XSECT Admin</h1>
      <p className="text-sm text-muted-foreground mt-2">Live database-backed operations, simulation, plans, and product analytics.</p>
    </header>
    <div className="flex gap-2 overflow-x-auto border-b border-border mb-7">
      {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{item}</button>)}
    </div>
    {tab === 'Overview' && <Overview />}
    {tab === 'Simulation' && <Simulation />}
    {tab === 'Users' && <UsersTab />}
    {tab === 'Plans' && <PlansTab />}
    {tab === 'Analytics' && <Analytics />}
    {tab === 'Admins' && <AdminsTab />}
  </div>;
}

function Overview() {
  const query = useAdminOverview();
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading live overview…</p>;
  if (!query.data) return <Notice error={query.error} />;
  const { counts } = query.data;
  const crossings = counts.crossings as { last24h: number; last7d: number; total: number };
  const statEntries = Object.entries(counts).filter(([key]) => key !== 'crossings') as Array<[string, number]>;
  return <div className="space-y-7">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statEntries.map(([label, value]) => <Card key={label} label={label.replace(/([A-Z])/g, ' $1')} value={value} />)}
      <Card label="crossings · 24h" value={crossings.last24h} /><Card label="crossings · 7d" value={crossings.last7d} /><Card label="crossings · total" value={crossings.total} />
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-bold mb-4">XSECTs by type and status</h2><div className="space-y-2">{query.data.xsects.map((row) => <div key={`${row.type}-${row.status}`} className="flex justify-between text-sm border-b py-2"><span>{row.type} · {row.status}</span><strong>{row.value}</strong></div>)}{!query.data.xsects.length && <p className="text-sm text-muted-foreground">No XSECTs yet.</p>}</div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-bold mb-4">Top crossing areas</h2><div className="space-y-2">{query.data.topAreas.map((row) => <div key={`${row.city}-${row.area}`} className="flex justify-between text-sm border-b py-2"><span>{row.area}, {row.city}</span><strong>{row.crossings}</strong></div>)}{!query.data.topAreas.length && <p className="text-sm text-muted-foreground">No crossings yet.</p>}</div></section>
    </div>
  </div>;
}

function Simulation() {
  const [userSearch, setUserSearch] = useState('');
  const users = useAdminUsers(userSearch, 1);
  const areasQuery = useAdminAreas();
  const action = useAdminAction();
  const { user } = useUser();
  const profiles = users.data?.users ?? [];
  const areas = areasQuery.data?.areas ?? [];
  const cities = [...new Set(areas.map((area) => area.city))];
  const [form, setForm] = useState({ userAId: '', userBId: '', city: '', area: '', distanceBand: 'lt_250m', durationMinutes: 5 });
  const [result, setResult] = useState<any>(null);
  const submit = (path: string, body: unknown) => action.mutate({ path, body }, { onSuccess: setResult });
  const areaOptions = areas.filter((area) => area.city === form.city);
  return <div className="grid lg:grid-cols-2 gap-6">
    <section className="rounded-2xl border bg-white p-6 space-y-4">
      <div className="flex items-center gap-2"><Zap className="text-primary" size={19} /><h2 className="font-bold">Generate crossing</h2></div>
      <label className="text-xs text-muted-foreground">Search profiles<input className={inputClass} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Name, role, or user id" /></label>
      <label className="text-xs text-muted-foreground">User A<select className={inputClass} value={form.userAId} onChange={(e) => setForm({ ...form, userAId: e.target.value })}><option value="">Select profile</option>{profiles.map((profile) => <UserOption key={profile.userId} user={profile} />)}</select></label>
      <label className="text-xs text-muted-foreground">User B<select className={inputClass} value={form.userBId} onChange={(e) => setForm({ ...form, userBId: e.target.value })}><option value="">Select profile</option>{profiles.map((profile) => <UserOption key={profile.userId} user={profile} />)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">City<select className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, area: '' })}><option value="">Select city</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Area<select className={inputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}><option value="">Select area</option>{areaOptions.map(({ area }) => <option key={area}>{area}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">Distance band<select className={inputClass} value={form.distanceBand} onChange={(e) => setForm({ ...form, distanceBand: e.target.value })}>{distanceBands.map((band) => <option key={band}>{band}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Duration (minutes)<input className={inputClass} type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></label>
      </div>
      <button className={buttonClass} disabled={action.isPending || !form.userAId || !form.userBId || !form.city || !form.area} onClick={() => submit('/admin/simulate/crossing', form)}>Generate crossing</button>
      <hr />
      <h3 className="font-semibold">Batch controls</h3>
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} disabled={!form.city || !form.area || action.isPending} onClick={() => submit('/admin/simulate/area', { city: form.city, area: form.area, count: 10, includeUserId: form.userAId || undefined })}>Simulate area activity</button>
        <button className={buttonClass} disabled={!user?.id || action.isPending} onClick={() => submit('/admin/simulate/user-day', { userId: user?.id, crossings: 5 })}>Simulate my day</button>
        <button className={buttonClass} disabled={action.isPending} onClick={() => submit('/admin/recompute', form.userAId ? { userId: form.userAId } : {})}><RefreshCw size={15} /> Recompute</button>
        <button className={buttonClass} disabled={action.isPending} onClick={() => submit('/admin/expire', {})}>Expire stale</button>
      </div>
      <Notice error={action.error} />
    </section>
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="font-bold mb-4">Simulation result</h2>
      {!result && <p className="text-sm text-muted-foreground">Run a simulation to inspect real engine output.</p>}
      {result?.summary && <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary font-medium">{result.summary}</p>}
      {result?.xsects && <div className="grid sm:grid-cols-2 gap-3 mt-4">{(['forA', 'forB'] as const).map((side) => <div key={side} className="border rounded-xl p-4"><p className="text-xs uppercase text-muted-foreground">{side === 'forA' ? 'User A' : 'User B'}</p>{result.xsects[side] ? <><p className="text-3xl font-bold mt-2">{result.xsects[side].score}</p><ul className="mt-3 text-sm list-disc pl-4 space-y-1">{result.xsects[side].explanation?.map((line: string) => <li key={line}>{line}</li>)}</ul></> : <p className="text-sm text-muted-foreground mt-2">Not eligible{result.eligibility?.[side] ? ` — ${result.eligibility[side]}` : ''}</p>}</div>)}</div>}
      {result?.results && <p className="mt-4 text-sm">{result.results.length} crossing records completed.</p>}
    </section>
  </div>;
}
function UserOption({ user }: { user: AdminUser }) { return <option value={user.userId}>{user.displayName || user.userId} · {user.role || 'No role'}{user.area ? ` · ${user.area}` : ''}{user.visibility && user.visibility !== 'discoverable' ? ` · ${user.visibility}` : ''}</option>; }

function UsersTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const users = useAdminUsers(q, page);
  const detail = useAdminUser(selected);
  const data = detail.data as any;
  return <div className="grid lg:grid-cols-[1fr_380px] gap-6">
    <section className="rounded-2xl border bg-white overflow-hidden">
      <div className="p-4 border-b flex items-center gap-2"><Search size={16} /><input className="w-full outline-none text-sm" placeholder="Search name, role, or user id" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary/60 text-left"><tr><th className="p-3">Profile</th><th className="p-3">Location</th><th className="p-3">Trust</th><th className="p-3">Signals</th></tr></thead><tbody>{users.data?.users.map((profile) => <tr key={profile.userId} onClick={() => setSelected(profile.userId)} className="border-t cursor-pointer hover:bg-secondary/30"><td className="p-3"><strong>{profile.displayName || 'Unnamed'}</strong><p className="text-xs text-muted-foreground">{profile.role || profile.userId}</p></td><td className="p-3">{[profile.area, profile.city].filter(Boolean).join(', ') || '—'}</td><td className="p-3">{profile.trustLevel}<p className="text-xs text-muted-foreground">{profile.visibility}</p></td><td className="p-3">{profile.counts.wants}W · {profile.counts.offers}O · {profile.counts.xsects}X</td></tr>)}</tbody></table></div>
      {!users.data?.users.length && <p className="p-8 text-sm text-muted-foreground">No profiles found.</p>}
      <div className="p-4 border-t flex justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-xs text-muted-foreground">Page {page} of {users.data?.pages || 1}</span><button disabled={page >= (users.data?.pages || 1)} onClick={() => setPage(page + 1)}>Next</button></div>
    </section>
    <aside className="rounded-2xl border bg-white p-5">
      {!selected && <p className="text-sm text-muted-foreground">Select a profile to inspect its DB-backed activity.</p>}
      {detail.isLoading && <p className="text-sm text-muted-foreground">Loading profile…</p>}
      {data?.profile && <><h2 className="text-xl font-bold">{data.profile.displayName || 'Unnamed profile'}</h2><p className="text-sm text-muted-foreground">{data.profile.role}</p><dl className="mt-5 grid grid-cols-2 gap-3">{['wants', 'offers', 'xsects', 'crossings', 'missed'].map((key) => <div key={key} className="border rounded-lg p-3"><dt className="text-xs uppercase text-muted-foreground">{key}</dt><dd className="text-xl font-bold">{data[key]?.length ?? 0}</dd></div>)}</dl><p className="mt-5 text-xs text-muted-foreground">Last active {new Date(data.profile.lastActiveAt).toLocaleString()}</p></>}
      <Notice error={detail.error} />
    </aside>
  </div>;
}

function PlansTab() {
  const overrides = useAdminOverrides();
  const [userSearch, setUserSearch] = useState('');
  const users = useAdminUsers(userSearch, 1);
  const action = useAdminAction();
  const [userId, setUserId] = useState('');
  const [plan, setPlan] = useState<Plan>('pro');
  return <section className="rounded-2xl border bg-white p-6">
    <h2 className="font-bold">Demo plan overrides</h2><p className="text-sm text-muted-foreground mt-1 mb-5">Overrides are enforced by the backend and persist across sessions.</p>
    <div className="grid sm:grid-cols-2 gap-3 mb-3"><input className={inputClass} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search profile to change plan" /><span /></div>
    <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 mb-6"><select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select user</option>{users.data?.users.map((profile) => <UserOption key={profile.userId} user={profile} />)}</select><select className={inputClass} value={plan} onChange={(e) => setPlan(e.target.value as Plan)}><option value="free">Free</option><option value="pro">Pro</option><option value="pro_plus">Pro+</option></select><button className={buttonClass} disabled={!userId || action.isPending} onClick={() => action.mutate({ path: `/admin/plan-overrides/${userId}`, method: 'PUT', body: { plan } })}>Set plan</button></div>
    <div className="space-y-2">{overrides.data?.overrides.map((item) => <div key={item.userId} className="flex items-center justify-between border rounded-xl p-4"><div><strong>{item.displayName || item.userId}</strong><p className="text-xs text-muted-foreground">{item.role || item.userId} · set by {item.setBy}</p></div><div className="flex items-center gap-3"><span className="font-mono-custom text-xs uppercase">{item.plan.replace('_', '+')}</span><button className="text-xs text-destructive" onClick={() => action.mutate({ path: `/admin/plan-overrides/${item.userId}`, method: 'DELETE' })}>Remove</button></div></div>)}</div>
    {!overrides.data?.overrides.length && <p className="text-sm text-muted-foreground">No plan overrides.</p>}<Notice error={action.error ?? overrides.error} />
  </section>;
}

function Analytics() {
  const [days, setDays] = useState(30);
  const funnel = useAdminFunnel(days);
  const events = useAdminEvents(days);
  const max = Math.max(1, ...(funnel.data?.funnel.map((step) => step.count) ?? [1]));
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h2 className="font-bold flex items-center gap-2"><BarChart3 size={18} /> Product funnel</h2><p className="text-sm text-muted-foreground">Unique users per tracked step.</p></div><select className="rounded-lg border p-2 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div>
    <section className="rounded-2xl border bg-white p-6 space-y-4">{funnel.data?.funnel.map((step) => <div key={step.name}><div className="flex justify-between text-sm mb-1"><span>{step.label.replaceAll('_', ' ')}</span><span><strong>{step.count}</strong> · {step.conversion}%</span></div><div className="h-3 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(step.count ? 2 : 0, step.count / max * 100)}%` }} /></div></div>)}</section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="font-bold mb-4">Daily XSECT and request activity</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={funnel.data?.daily ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="xsect_created" stroke="#7c3aed" /><Line type="monotone" dataKey="request_sent" stroke="#059669" /></LineChart></ResponsiveContainer></div></section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="font-bold mb-4">Recent events</h2><div className="space-y-2 max-h-80 overflow-y-auto">{events.data?.events.map((event) => <div key={event.id} className="flex justify-between border-b py-2 text-sm"><span>{event.name}<small className="block text-muted-foreground">{event.userId || 'system'}</small></span><time className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</time></div>)}</div></section>
  </div>;
}

function AdminsTab() {
  const admins = useAdmins();
  const users = useAdminUsers('', 1);
  const action = useAdminAction();
  const [userId, setUserId] = useState('');
  const { user } = useUser();
  return <section className="rounded-2xl border bg-white p-6">
    <h2 className="font-bold flex gap-2 items-center"><Users size={18} /> Administrators</h2>
    <div className="flex gap-3 mt-5 mb-6"><select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)}><option value="">Select user</option>{users.data?.users.map((profile) => <UserOption key={profile.userId} user={profile} />)}</select><button className={buttonClass} disabled={!userId || action.isPending} onClick={() => action.mutate({ path: '/admin/admins', body: { userId } }, { onSuccess: () => setUserId('') })}>Add admin</button></div>
    <div className="space-y-2">{admins.data?.admins.map((admin) => <div key={admin.userId} className="flex justify-between border rounded-xl p-4"><div><strong>{admin.displayName || admin.userId}</strong><p className="text-xs text-muted-foreground">{admin.role || 'Administrator'} · added {new Date(admin.createdAt).toLocaleDateString()}</p></div><button className="text-sm text-destructive" onClick={() => action.mutate({ path: `/admin/admins/${admin.userId}`, method: 'DELETE' })}>{admin.userId === user?.id ? 'Remove me' : 'Remove'}</button></div>)}</div>
    <Notice error={action.error ?? admins.error} />
  </section>;
}