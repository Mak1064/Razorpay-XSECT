import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useStore } from '../store';
import { useActivity } from '../lib/activity';
import { useUser } from '@clerk/react';
import { 
  Radar, Compass, Layers3, Network, Bot, Calendar, MessageSquare, 
  Menu, X, Bell, CheckCheck, Target, Building2, Route as RouteIcon, BellRing, ShieldCheck
} from 'lucide-react';
import { useIsAdmin } from '../hooks/use-admin';

const baseNavItems = [
  { href: '/radar', label: 'Radar', icon: Radar },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/xsects', label: 'XSECTs', icon: Layers3 },
  { href: '/network', label: 'Network', icon: Network },
  { href: '/ai', label: 'Intelligence', icon: Bot },
  { href: '/opportunities', label: 'Wants & Offers', icon: Target },
  { href: '/paths', label: 'Paths', icon: RouteIcon },
  { href: '/alerts', label: 'Alerts', icon: BellRing },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
];
const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };

export default function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { state } = useStore();
  const { user } = useUser();
  const activity = useActivity(user?.id);
  const isAdmin = useIsAdmin();
  const navItems = isAdmin ? [...baseNavItems, adminItem] : baseNavItems;

  const profileName = state.profile?.name || user?.fullName || 'User';
  const initial = profileName.charAt(0);
  const isPremium = state.plan !== 'free';
  const unreadNotifications = activity.snapshot.notifications.filter((notification) => !notification.read).length;
  const notificationBell = (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setNotificationsOpen((open) => !open)}
        aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
        aria-expanded={notificationsOpen}
        className="relative bg-white border border-border rounded-full p-2 text-muted-foreground hover:text-foreground shadow-sm transition-colors"
      >
        <Bell size={18} />
        {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">{unreadNotifications}</span>}
      </button>
      {notificationsOpen && (
        <div className="fixed md:absolute top-16 md:top-12 left-3 right-3 md:left-auto md:right-0 md:w-96 bg-white border border-border rounded-2xl shadow-2xl overflow-hidden z-[70]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="font-bold">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadNotifications ? `${unreadNotifications} unread` : 'You are all caught up'}</p>
            </div>
            {unreadNotifications > 0 && (
              <button onClick={() => activity.markAllNotificationsRead()} className="text-xs font-bold text-primary flex items-center gap-1"><CheckCheck size={14} /> Mark all read</button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {activity.snapshot.notifications.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">No notifications yet.</p>
            ) : activity.snapshot.notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href ?? '/radar'}
                onClick={() => { activity.markNotificationRead(notification.id); setNotificationsOpen(false); }}
                className={`block p-4 border-b border-border last:border-0 hover:bg-secondary/60 transition-colors ${notification.read ? 'bg-white' : 'bg-primary/[0.04]'}`}
              >
                <div className="flex gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notification.read ? 'bg-border' : 'bg-primary'}`} />
                  <div>
                    <p className="text-sm font-bold text-foreground">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.description}</p>
                    <p className="text-[10px] font-mono-custom text-muted-foreground mt-2">{notification.createdAt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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
          <div className="mt-3 flex gap-3 px-3 text-[11px] text-muted-foreground">
            <Link href="/privacy-center" className="hover:text-foreground">Privacy Center</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-white/80 backdrop-blur sticky top-0 z-40">
        <Link href="/" className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
          <img src="/logo.svg" alt="XSECT" className="w-5 h-5" />
          XSECT
        </Link>
        <div className="flex items-center gap-4">
          {notificationBell}
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
          {notificationBell}
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
