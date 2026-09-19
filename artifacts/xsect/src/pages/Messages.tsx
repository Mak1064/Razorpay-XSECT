import { useState } from 'react';
import { Send, ShieldCheck } from 'lucide-react';

export default function MessagesPage() {
  const [msg, setMsg] = useState('');
  
  return (
    <div className="flex flex-col h-[100dvh] md:h-full">
      <header className="p-4 md:p-6 border-b border-border bg-white flex items-center justify-between z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alex Rivera</h1>
          <p className="text-xs font-mono-custom text-muted-foreground">Staff Product Designer</p>
        </div>
        <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-mono-custom font-semibold uppercase flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-primary"/> Mutual Connection
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center text-xs font-mono-custom text-muted-foreground my-4">
            Identity revealed. You can now message freely.
          </div>
          
          <div className="flex justify-start">
            <div className="bg-white border border-border p-4 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm">
              <p className="text-sm font-medium text-foreground">Hi! Saw your intent regarding Series C roles. I'm actually leaving my current spot and they are looking for a strong IC to take over design systems.</p>
              <span className="text-[10px] text-muted-foreground mt-2 block">10:42 AM</span>
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="bg-foreground text-background p-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
              <p className="text-sm font-medium">Oh nice, thanks for reaching out. What stage is the systems work in right now?</p>
              <span className="text-[10px] text-background/60 mt-2 block">11:05 AM</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-border shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <input 
            type="text" 
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Send a message..." 
            className="w-full bg-secondary border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
