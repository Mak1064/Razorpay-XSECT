import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useStore } from '../store';
import { 
  Radar, Compass, Layers3, Network, Bot, Calendar, MessageSquare, 
  Settings, User, Menu, X, Bell 
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Radar', icon: Radar },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/xsects', label: 'Archive', icon: Layers3 },
  { href: '/network', label: 'Network', icon: Network },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/ai', label: 'Intelligence', icon: Bot },
];

export default function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = useStore();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col h-[100dvh] sticky top-0">
        <div className="p-6">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wider text-foreground">
            XSECT.
          </Link>
          <div className="mt-4 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 flex items-center gap-2 w-fit">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></span>
            <span className="font-mono-custom text-[10px] uppercase tracking-widest text-primary">Live Signal</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} 
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                location === item.href 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}>
              <item.icon size={18} strokeWidth={location === item.href ? 2.5 : 2} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border">
          <Link href="/profile" className="flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-medium">
              {state.profile?.name.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{state.profile?.name || 'User'}</span>
              <span className="text-[10px] text-muted-foreground font-mono-custom">Protected</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <Link href="/" className="font-serif text-xl font-bold tracking-wider text-foreground">
          XSECT.
        </Link>
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground"><Bell size={20} /></button>
          <button onClick={() => setMenuOpen(true)} className="text-foreground"><Menu size={24} /></button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col fade-in">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <span className="font-serif text-xl font-bold tracking-wider text-foreground">Menu</span>
            <button onClick={() => setMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
          </div>
          <nav className="flex-1 p-6 space-y-4">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-4 text-lg ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon size={24} /> {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative">
        <div className="absolute top-0 right-0 p-6 hidden md:flex items-center gap-4 z-10 pointer-events-none">
          <div className="pointer-events-auto bg-card border border-border rounded-full p-2 text-muted-foreground hover:text-foreground cursor-pointer transition">
            <Bell size={18} />
          </div>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border z-30 flex justify-around p-2 pb-safe">
        {navItems.slice(0, 4).map(item => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 gap-1 ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
        <Link href="/profile" className={`flex flex-col items-center p-2 gap-1 ${location === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
          <User size={20} />
          <span className="text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
