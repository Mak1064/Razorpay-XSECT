import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useStore } from '../store';
import { useUser } from '@clerk/react';
import { 
  Radar, Compass, Layers3, Network, Bot, Calendar, MessageSquare, 
  Menu, X, Bell 
} from 'lucide-react';

const navItems = [
  { href: '/radar', label: 'Radar', icon: Radar },
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
  const { user } = useUser();

  const profileName = state.profile?.name || user?.fullName || 'User';
  const initial = profileName.charAt(0);
  const isPremium = state.plan !== 'free';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-white flex-col h-[100dvh] sticky top-0 z-40">
        <div className="p-6">
          <Link href="/" className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <img src="/logo.svg" alt="XSECT" className="w-6 h-6" />
            XSECT
          </Link>
          <div className="mt-4 px-2.5 py-1 rounded border border-primary/20 bg-primary/5 flex items-center gap-2 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="font-mono-custom font-semibold text-[10px] uppercase tracking-widest text-primary">
              {state.locationTracking === 'tracking' ? 'Tracking Active' : 'Radar Offline'}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                location === item.href 
                  ? 'bg-secondary text-foreground font-bold shadow-sm' 
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground font-medium'
              }`}>
              <item.icon size={18} strokeWidth={location === item.href ? 2.5 : 2} className={location === item.href ? 'text-primary' : ''} />
              <span className="text-sm">{item.label}</span>
              {item.href === '/ai' && !isPremium && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border">
          <Link href="/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-secondary transition-all">
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold truncate max-w-[120px]">{profileName}</span>
              <span className="text-[10px] text-muted-foreground font-mono-custom font-semibold uppercase">{isPremium ? state.plan : 'Protected'}</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-white/80 backdrop-blur sticky top-0 z-40">
        <Link href="/" className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
          <img src="/logo.svg" alt="XSECT" className="w-5 h-5" />
          XSECT
        </Link>
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground"><Bell size={20} /></button>
          <button onClick={() => setMenuOpen(true)} className="text-foreground"><Menu size={24} /></button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col fade-in">
          <div className="flex justify-between items-center p-4 border-b border-border bg-white">
            <span className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
              <img src="/logo.svg" alt="XSECT" className="w-5 h-5" /> XSECT
            </span>
            <button onClick={() => setMenuOpen(false)} className="p-2 bg-secondary rounded-full"><X size={20} /></button>
          </div>
          <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-4 text-lg font-bold ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon size={24} /> {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative pb-16 md:pb-0">
        <div className="absolute top-0 right-0 p-6 hidden md:flex items-center gap-4 z-10 pointer-events-none">
          {state.plan === 'free' && (
            <Link href="/plans" className="pointer-events-auto bg-primary text-primary-foreground font-bold text-xs px-3 py-1.5 rounded-md hover:bg-primary/90 shadow-sm transition-colors">
              Upgrade
            </Link>
          )}
          <div className="pointer-events-auto bg-white border border-border rounded-full p-2 text-muted-foreground hover:text-foreground cursor-pointer shadow-sm transition-colors">
            <Bell size={18} />
          </div>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 flex justify-around p-2 pb-safe">
        {navItems.slice(0, 4).map(item => (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 gap-1 ${location === item.href ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
            <item.icon size={20} strokeWidth={location === item.href ? 2.5 : 2} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
        <Link href="/profile" className={`flex flex-col items-center p-2 gap-1 ${location === '/profile' ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
          <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
            {initial}
          </div>
          <span className="text-[10px]">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
