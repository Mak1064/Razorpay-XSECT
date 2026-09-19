import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/react';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { useActivity } from '../lib/activity';

export default function MessagesPage() {
  const { user } = useUser();
  const activity = useActivity(user?.id);
  const accepted = activity.snapshot.connections.filter((connection) => connection.status === 'accepted');
  const requestedThread = new URLSearchParams(window.location.search).get('thread');
  const [selectedId, setSelectedId] = useState(requestedThread ?? accepted[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const selected = accepted.find((connection) => connection.id === selectedId);
  const messages = useMemo(
    () => activity.snapshot.messages.filter((message) => message.connectionId === selectedId),
    [activity.snapshot.messages, selectedId],
  );

  useEffect(() => {
    if (selectedId) activity.markMessagesRead(selectedId);
  }, [selectedId]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text) return;
    activity.sendMessage(selected.id, text);
    setDraft('');
  };

  if (accepted.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5"><MessageCircle size={24} /></div>
          <h1 className="text-2xl font-bold mb-2">No conversations yet</h1>
          <p className="text-sm text-muted-foreground">Messaging becomes available after both people accept a connection and reveal their identities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[300px_1fr] h-[calc(100dvh-65px)] md:h-[100dvh]">
      <aside className={`${selected ? 'hidden md:flex' : 'flex'} border-r border-border bg-white flex-col min-h-0`}>
        <header className="p-5 border-b border-border">
          <p className="text-xs font-mono-custom uppercase tracking-widest text-primary font-semibold mb-2">Consent-gated</p>
          <h1 className="text-2xl font-bold">Messages</h1>
        </header>
        <div className="overflow-y-auto p-3 space-y-1">
          {accepted.map((connection) => {
            const thread = activity.snapshot.messages.filter((message) => message.connectionId === connection.id);
            const last = thread.at(-1);
            const unread = thread.filter((message) => message.from === 'them' && !message.read).length;
            return (
              <button
                key={connection.id}
                onClick={() => setSelectedId(connection.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${selectedId === connection.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
              >
                <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold shrink-0">{connection.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{connection.name}</p>
                    {unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">{unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{last?.text ?? 'Start a conversation'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {selected ? (
        <section className="flex flex-col min-w-0 min-h-0">
          <header className="p-4 md:p-5 border-b border-border bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSelectedId('')} className="md:hidden text-sm font-bold text-primary">Back</button>
              <div className="min-w-0">
                <h2 className="font-bold text-foreground truncate">{selected.name}</h2>
                <p className="text-xs text-muted-foreground truncate">{selected.role}</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-mono-custom font-semibold uppercase flex items-center gap-1.5 shrink-0">
              <ShieldCheck size={12} className="text-emerald-600" /> Mutually revealed
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="text-center text-xs text-muted-foreground py-3">This private thread opened after mutual consent.</div>
              {messages.length === 0 && (
                <div className="text-center py-20">
                  <p className="font-bold">Start the conversation</p>
                  <p className="text-sm text-muted-foreground mt-1">Introduce yourself or reference the intent that brought you together.</p>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.from === 'self' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[82%] shadow-sm ${message.from === 'self' ? 'bg-foreground text-background rounded-tr-sm' : 'bg-white border border-border rounded-tl-sm'}`}>
                    <p className="text-sm font-medium leading-relaxed">{message.text}</p>
                    <span className={`text-[10px] mt-2 block ${message.from === 'self' ? 'text-background/60' : 'text-muted-foreground'}`}>{message.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-border shrink-0">
            <div className="max-w-3xl mx-auto relative">
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${selected.name}`}
                aria-label={`Message ${selected.name}`}
                className="w-full bg-secondary border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-foreground text-background rounded-lg disabled:opacity-40 hover:bg-foreground/90 transition-colors">
                <Send size={14} />
              </button>
            </div>
          </form>
        </section>
      ) : (
        <div className="hidden md:flex items-center justify-center text-center p-6">
          <div>
            <MessageCircle size={28} className="mx-auto text-muted-foreground mb-3" />
            <p className="font-bold">Choose a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}