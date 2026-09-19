import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useUser } from '@clerk/react';
import { Check, MessageCircle, Search, ShieldCheck, UserRound, X, Ban, Star, Handshake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAcceptConnection, useBlockConnection, useConnections, useDeclineConnection, useWithdrawConnection, useReport, useReveal } from '../hooks/use-social';
import { useAcceptIntroduction, useCompleteIntroduction, useCreateReview, useDeclineIntroduction, useIntroductions, useMyReviews, useReputation } from '../hooks/use-network';

export default function NetworkPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { data, isLoading, isError } = useConnections();
  const accept = useAcceptConnection(); const report = useReport(); const reveal = useReveal(); const decline = useDeclineConnection(); const block = useBlockConnection(); const withdraw = useWithdrawConnection();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'connections' | 'bridge' | 'reviews'>('connections');
  const [reviewConnection, setReviewConnection] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const introductions = useIntroductions(); const acceptIntroduction = useAcceptIntroduction(); const declineIntroduction = useDeclineIntroduction(); const completeIntroduction = useCompleteIntroduction();
  const reviews = useMyReviews(); const reputation = useReputation(); const createReview = useCreateReview();
  const connections = (data?.all ?? []).filter((connection) => connection.status !== 'declined' && connection.status !== 'blocked');
  const filtered = useMemo(() => connections.filter((connection) =>
    `${connection.requesterId} ${connection.recipientId}`.toLowerCase().includes(search.toLowerCase()),
  ), [connections, search]);
  const incoming = filtered.filter((connection) => connection.recipientId === user?.id && connection.status === 'pending');
  const outgoing = filtered.filter((connection) => connection.requesterId === user?.id && connection.status === 'pending');
  const accepted = filtered.filter((connection) => connection.status === 'accepted');
  if (isLoading) return <div className="p-10">Loading your network…</div>;
  if (isError) return <div className="p-10 text-destructive">Unable to load your network. Please try again.</div>;

  const notify = (title: string, description: string) => toast({ title, description });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full">
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-3">Consent layer</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">Your network</h1>
            <p className="text-sm text-muted-foreground max-w-xl">Identity stays protected until both people agree. Every connection action can be reversed.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search network"
              placeholder="Search connections"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
          </div>
        </div>
      </header>

      <div className="flex gap-1 bg-secondary p-1 rounded-xl mb-8 w-fit">
        {([['connections', 'Connections'], ['bridge', 'Bridge inbox'], ['reviews', 'Reviews']] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === value ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}>{label}</button>)}
      </div>
      {tab === 'connections' && <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h2 className="text-lg font-bold text-foreground">Incoming requests</h2>
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{incoming.length}</span>
          </div>
          {incoming.length === 0 ? (
            <EmptyState title="No pending requests" text="When someone wants to connect, their protected signal will appear here." />
          ) : (
            <div className="grid gap-4">
              {incoming.map((person) => (
                <div key={person.id} className="bg-white border border-border p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-mono-custom text-muted-foreground mb-1">Protected signal</p>
                      <p className="font-bold text-foreground">{person.identity?.userId ?? (person.requesterId === user?.id ? person.recipientId : person.requesterId)}</p>
                      <p className="text-sm text-muted-foreground mt-1">“Mutual consent is required before identity is revealed.”</p>
                    </div>
                  </div>
                  <div className="flex gap-2 md:shrink-0">
                    <button onClick={() => { decline.mutate(person.id); notify('Request declined', 'The signal has been removed from your queue.'); }} className="px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-1.5">
                      <X size={15} /> Decline
                    </button>
                    <button onClick={() => { accept.mutate(person.id); notify('Connection accepted', 'Identity is now revealed and messaging is available.'); }} className="px-4 py-2 bg-foreground text-background text-sm font-bold rounded-lg hover:bg-foreground/90 transition-colors flex items-center gap-1.5">
                      <Check size={15} /> Accept & reveal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {outgoing.length > 0 && (
          <section>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 className="text-lg font-bold text-foreground">Awaiting response</h2>
              <span className="text-xs font-mono-custom text-muted-foreground">{outgoing.length} protected</span>
            </div>
            <div className="grid gap-3">
              {outgoing.map((person) => (
                <div key={person.id} className="bg-white border border-border p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-foreground">{person.identity?.userId ?? (person.requesterId === user?.id ? person.recipientId : person.requesterId)}</p>
                    <p className="text-sm text-muted-foreground">Request sent. Names remain hidden until accepted.</p>
                  </div>
                  <button onClick={() => { withdraw.mutate(person.id); notify('Request withdrawn', 'You can send a new request later.'); }} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Withdraw</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h2 className="text-lg font-bold text-foreground">Accepted connections</h2>
            <span className="text-xs font-mono-custom text-muted-foreground">{accepted.length} revealed</span>
          </div>
          {accepted.length === 0 ? (
            <EmptyState title="Your accepted network is empty" text="Accept a request or send one from Discover to start a conversation." />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {accepted.map((person) => (
                <div key={person.id} className="bg-white border border-border p-5 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-secondary border border-border rounded-full flex items-center justify-center font-bold text-lg text-foreground">
                      {(person.identity?.userId ?? 'U').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{person.identity?.userId ?? (person.requesterId === user?.id ? person.recipientId : person.requesterId)}</h3>
                      <p className="text-xs font-mono-custom text-muted-foreground truncate">{person.identity?.userId ?? (person.requesterId === user?.id ? person.recipientId : person.requesterId)}</p>
                    </div>
                    <UserRound size={16} className="ml-auto text-emerald-600" />
                  </div>
                  <p className="text-sm text-foreground font-medium bg-secondary p-3 rounded-lg line-clamp-2 mb-4">Mutual consent is required before identity is revealed.</p><button onClick={() => reveal.mutate({connectionId:person.id,fields:['name','role','intent']},{onSuccess:()=>notify('Reveal recorded','Selected profile fields are now shared.')})} className="text-xs font-semibold text-primary mb-4">Reveal name, role & intent</button>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { const reason=window.prompt('Why are you blocking this person?'); if(!reason?.trim()) return; report.mutate({subjectId: person.identity?.userId ?? (person.requesterId === user?.id ? person.recipientId : person.requesterId),connectionId:person.id,reason:reason.trim()},{onSuccess:()=>notify('Reported and blocked','Moderation has recorded your report.')}); }} className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1">
                      <Ban size={13} /> Report & block
                    </button>
                    <Link href={`/messages?thread=${person.id}`} className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1.5">
                      <MessageCircle size={15} /> Message
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>}
      {tab === 'bridge' && <div className="space-y-8">
        <section><div className="flex items-center justify-between border-b pb-3 mb-4"><h2 className="text-lg font-bold">Bridge inbox</h2><span className="text-xs font-mono-custom">{introductions.data?.inbox.length ?? 0} pending</span></div>{introductions.data?.inbox.map((intro) => <div key={intro.id} className="bg-white border rounded-xl p-5 mb-3"><div className="flex gap-3"><Handshake className="text-primary shrink-0" size={20} /><div><p className="font-bold">Introduction request</p><p className="text-sm text-muted-foreground mt-1">{intro.reason}</p><p className="text-xs text-muted-foreground mt-2">Expires {intro.expiresAt ? new Date(intro.expiresAt).toLocaleDateString() : 'in 14 days'}</p></div></div><div className="flex gap-2 justify-end mt-4"><button onClick={() => declineIntroduction.mutate(intro.id)} className="px-3 py-2 text-sm">Decline</button><button onClick={() => acceptIntroduction.mutate(intro.id)} className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-bold">Accept Bridge</button></div></div>)}{introductions.data?.inbox.length === 0 && <EmptyState title="No Bridge requests" text="Requests where you are the trusted intermediary will appear here." />}</section>
        <section><h2 className="text-lg font-bold border-b pb-3 mb-4">Introductions received</h2>{introductions.data?.received.map((intro) => <div key={intro.id} className="bg-white border rounded-xl p-4 flex items-center justify-between gap-4 mb-3"><div><p className="font-semibold text-sm">Bridge introduction</p><p className="text-xs text-muted-foreground">{intro.status}</p></div>{intro.status === 'accepted' && <button onClick={() => completeIntroduction.mutate(intro.id)} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-bold">Accept & connect</button>}</div>)}</section>
        <section><h2 className="text-lg font-bold border-b pb-3 mb-4">Sent</h2>{introductions.data?.sent.map((intro) => <div key={intro.id} className="py-3 flex justify-between text-sm"><span>{intro.reason}</span><span className="font-mono-custom text-xs uppercase">{intro.status}</span></div>)}</section>
      </div>}
      {tab === 'reviews' && <div className="grid lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border rounded-2xl p-5"><h2 className="text-lg font-bold">Leave a review</h2><p className="text-xs text-muted-foreground mt-1">Reviews are limited to mutually accepted connections.</p><select className="w-full border rounded-lg p-2.5 text-sm mt-5" value={reviewConnection} onChange={(event) => setReviewConnection(event.target.value)}><option value="">Select a connection</option>{accepted.map((connection) => <option key={connection.id} value={connection.id}>{connection.identity?.userId ?? (connection.requesterId === user?.id ? connection.recipientId : connection.requesterId)}</option>)}</select><label className="block text-xs mt-4">Overall rating<select className="w-full border rounded-lg p-2 mt-1" value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><textarea className="w-full border rounded-lg p-3 mt-4 min-h-24 text-sm" placeholder="Professional feedback" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} /><button disabled={!reviewConnection || createReview.isPending} onClick={() => createReview.mutate({ connectionId: reviewConnection, rating: reviewRating, professionalism: reviewRating, reliability: reviewRating, helpfulness: reviewRating, comment: reviewComment }, { onSuccess: () => { setReviewConnection(''); setReviewComment(''); } })} className="w-full bg-foreground text-background rounded-lg py-3 mt-4 text-sm font-bold disabled:opacity-50">Submit review</button>{createReview.isError && <p className="text-xs text-destructive mt-2">{createReview.error.message}</p>}</section>
        <section><div className="bg-white border rounded-2xl p-5 mb-5"><p className="text-xs font-mono-custom uppercase text-primary">Professional reputation</p><div className="flex items-end gap-3 mt-3"><span className="text-4xl font-bold">{reviews.data?.aggregate.score ?? 0}</span><span className="text-sm text-muted-foreground mb-1">/ 100 · {reviews.data?.aggregate.count ?? 0} reviews</span></div><p className="text-sm mt-3 flex items-center gap-2"><Star size={15} className="text-amber-500" />{reviews.data?.aggregate.endorsements ?? 0} endorsements · {reputation.data?.total ?? 0} reputation points</p></div><h2 className="font-bold border-b pb-3">Timeline</h2>{reputation.data?.events.map((event) => <div key={event.id} className="py-3 border-b flex justify-between text-sm"><span>{event.kind.replaceAll('_', ' ')}</span><span className={event.delta >= 0 ? 'text-emerald-700' : 'text-destructive'}>{event.delta >= 0 ? '+' : ''}{event.delta}</span></div>)}{reputation.data?.events.length === 0 && <p className="text-sm text-muted-foreground py-6">Your reputation timeline is empty.</p>}</section>
      </div>}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white border border-dashed border-border rounded-xl px-6 py-10 text-center">
      <ShieldCheck size={24} className="mx-auto text-muted-foreground mb-3" />
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{text}</p>
    </div>
  );
}