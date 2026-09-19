import { useStore } from '../store';
import { useState } from 'react';
import { ShieldCheck, Edit3, Check, Target, Lock, LogOut, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClerk, useUser } from '@clerk/react';
import { useLocation } from 'wouter';
import { useCreateBillingPortal } from '@workspace/api-client-react';

export default function Profile() {
  const { state, updateProfile, setLocationTrackingStatus } = useStore();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editIntent, setEditIntent] = useState(state.profile?.intent || '');
  const portal = useCreateBillingPortal();

  const handleSave = () => {
    updateProfile({ intent: editIntent });
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your signal has been recalibrated." });
  };

  const handleSignOut = async () => {
    // Clear in-memory geolocation watch if any when signing out
    setLocationTrackingStatus('idle', null);
    await signOut();
    setLocation('/');
  };

  const handleManageBilling = async () => {
    try {
      const result = await portal.mutateAsync();
      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: 'Unable to open billing',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const profileName = state.profile?.name || user?.fullName || 'Anonymous';
  const initial = profileName.charAt(0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto h-full">
      <header className="mb-10 border-b border-border pb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-mono-custom text-xs font-semibold uppercase tracking-widest text-primary">Your Signal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Make your intent legible.</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="px-6 py-2.5 bg-white border border-border rounded-lg text-sm font-bold hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm text-foreground"
          >
            {isEditing ? <><Check size={16}/> Save</> : <><Edit3 size={16}/> Edit Signal</>}
          </button>
          <button 
            onClick={handleSignOut}
            className="px-4 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <LogOut size={16}/> Sign out
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
        {/* Left Column: Identity Card */}
        <div className="bg-white border border-border rounded-2xl p-8 h-fit shadow-sm">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
            <div className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground text-3xl font-bold">
              {initial}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{profileName}</h2>
              <p className="text-sm text-muted-foreground font-medium">{state.profile?.role || 'Unspecified Role'}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Privacy Mode</span>
              <span className="flex items-center gap-1.5 text-primary font-mono-custom font-semibold uppercase text-[10px]"><ShieldCheck size={14}/> {state.profile?.privacyLevel || 'Balanced'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Account Email</span>
              <span className="text-foreground">{user?.primaryEmailAddress?.emailAddress || 'hidden'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Current Plan</span>
              <span className="font-mono-custom font-medium uppercase text-xs px-2 py-0.5 bg-secondary rounded">{state.plan}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Billing Status</span>
              <span className="font-medium capitalize">{state.billingStatus.replace('_', ' ')}</span>
            </div>
            {state.currentPeriodEnd && (
              <div className="flex justify-between items-center gap-4 text-sm">
                <span className="text-muted-foreground font-medium">
                  {state.cancelAtPeriodEnd ? 'Access until' : 'Renews'}
                </span>
                <span className="text-foreground text-right">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(state.currentPeriodEnd))}
                </span>
              </div>
            )}
            {state.plan !== 'free' && (
              <button
                onClick={handleManageBilling}
                disabled={portal.isPending}
                className="w-full px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CreditCard size={16} />
                {portal.isPending ? 'Opening Stripe…' : 'Manage subscription'}
              </button>
            )}
            
            <div className="bg-secondary/50 rounded-xl p-4 border border-border mt-8">
              <div className="flex items-center gap-2 text-xs font-mono-custom font-semibold uppercase text-muted-foreground mb-2">
                <Lock size={12}/> How you appear
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                {state.profile?.privacyLevel === 'strict' && "Only intent and skills visible. Role and name hidden until accepted."}
                {state.profile?.privacyLevel === 'balanced' && "Role category visible. Name hidden until accepted."}
                {state.profile?.privacyLevel === 'open' && "Role and initial visible to nearby matches."}
                {!state.profile?.privacyLevel && "Protected. Exact role, company, and name are hidden until you accept a request."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Intent & Skills */}
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-6 font-mono-custom text-xs font-semibold uppercase tracking-widest">
              <Target size={16} className="text-primary" /> Current Intent
            </div>
            
            {isEditing ? (
              <textarea 
                value={editIntent}
                onChange={e => setEditIntent(e.target.value)}
                className="w-full bg-background border border-primary/50 rounded-xl p-4 text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={4}
              />
            ) : (
              <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-snug">
                {state.profile?.intent || 'No intent set.'}
              </h3>
            )}
            
            <div className="mt-8 pt-8 border-t border-border">
              <div className="text-xs text-muted-foreground font-mono-custom font-semibold uppercase tracking-widest mb-4">Core Competencies</div>
              <div className="flex flex-wrap gap-2">
                {state.profile?.skills?.length ? state.profile.skills.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-secondary border border-border rounded-md text-sm font-medium text-foreground">
                    {s}
                  </span>
                )) : (
                  <span className="text-sm text-muted-foreground">No skills listed.</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Calibration</h3>
              <p className="text-sm text-muted-foreground">Adjust how aggressively XSECT surfaces your signal.</p>
            </div>
            <button className="px-5 py-2.5 bg-secondary border border-border rounded-lg text-sm font-bold hover:bg-secondary/80 transition-colors whitespace-nowrap">
              Manage Tuning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
