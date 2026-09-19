import { MessageSquare, Search } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="h-[100dvh] flex flex-col md:flex-row max-w-7xl mx-auto border-x border-border">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-border flex flex-col h-full bg-card">
        <div className="p-6 border-b border-border">
          <h1 className="font-serif text-2xl text-foreground mb-4">Messages</h1>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              placeholder="Search conversations..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Empty State */}
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
            <MessageSquare size={32} className="mb-4 opacity-20" />
            <p className="text-sm">No active conversations yet.</p>
            <p className="text-xs mt-2">Messages unlock when identities are revealed.</p>
          </div>
        </div>
      </div>
      
      {/* Main Area */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-background/50">
        <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <MessageSquare size={24} className="text-muted-foreground opacity-50" />
        </div>
        <h2 className="font-serif text-xl text-muted-foreground">Select a conversation</h2>
      </div>
    </div>
  );
}
