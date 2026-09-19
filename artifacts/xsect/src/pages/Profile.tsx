import { useStore } from '../store';
import { useState } from 'react';
import { ShieldCheck, Edit3, Check, EyeOff, Target, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { state, updateProfile } = useStore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editIntent, setEditIntent] = useState(state.profile?.intent || '');

  const handleSave = () => {
    updateProfile({ intent: editIntent });
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your signal has been recalibrated." });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto reveal">
      <header className="mb-12 border-b border-border pb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-mono-custom text-xs uppercase tracking-widest text-primary">Your Signal</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground">Make your intent legible.</h1>
        </div>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="px-6 py-3 bg-white/5 border border-border rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          {isEditing ? <><Check size={16}/> Save Changes</> : <><Edit3 size={16}/> Edit Signal</>}
        </button>
      </header>

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
        {/* Left Column: Identity Card */}
        <div className="bg-card border border-border rounded-3xl p-8 h-fit">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
            <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-serif text-3xl font-bold">
              {state.profile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="font-serif text-2xl text-foreground mb-1">{state.profile?.name}</h2>
              <p className="text-sm text-muted-foreground">{state.profile?.role}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Privacy Mode</span>
              <span className="flex items-center gap-1.5 text-primary font-mono-custom uppercase text-[10px]"><ShieldCheck size={14}/> {state.profile?.privacyLevel}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Location Baseline</span>
              <span className="text-foreground">{state.profile?.location}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Signal Completeness</span>
              <span className="font-mono-custom text-primary">84%</span>
            </div>
            
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mt-8">
              <div className="flex items-center gap-2 text-xs font-mono-custom uppercase text-primary mb-2">
                <Lock size={12}/> How you appear
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Others see you as "Protected Professional". Your exact role, company, and name are hidden until you accept a connection request.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Intent & Skills */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8">
            <div className="flex items-center gap-2 text-muted-foreground mb-4 font-mono-custom text-xs uppercase tracking-widest">
              <Target size={16} className="text-accent" /> Current Intent
            </div>
            
            {isEditing ? (
              <textarea 
                value={editIntent}
                onChange={e => setEditIntent(e.target.value)}
                className="w-full bg-background border border-primary/50 rounded-xl p-4 text-foreground text-lg focus:outline-none resize-none font-serif"
                rows={4}
              />
            ) : (
              <h3 className="font-serif text-3xl text-foreground leading-snug">
                {state.profile?.intent || 'No intent set.'}
              </h3>
            )}
            
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="text-xs text-muted-foreground font-mono-custom uppercase tracking-widest mb-4">Core Competencies</div>
              <div className="flex flex-wrap gap-2">
                {state.profile?.skills?.map(s => (
                  <span key={s} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl text-foreground mb-1">Calibration</h3>
              <p className="text-sm text-muted-foreground">Adjust how aggressively XSECT surfaces nearby signals.</p>
            </div>
            <button className="px-4 py-2 bg-white/5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
              Manage Tuning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
