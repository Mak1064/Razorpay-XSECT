import { useState } from 'react';
import { useLocation } from 'wouter';
import { useStore, UserProfile } from '../store';
import { ArrowRight, ArrowLeft, Shield, Target, Compass, Lock, X } from 'lucide-react';

const steps = ['intent', 'skills', 'privacy', 'complete'];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { completeOnboarding } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: 'Alex Morgan',
    role: 'Operator · climate systems',
    location: 'SF Bay Area',
    intent: 'Looking for an operating partner or a small team exploring climate and resilient systems.',
    skills: [],
    privacyLevel: 'balanced'
  });

  const [skillInput, setSkillInput] = useState('');

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      completeOnboarding(profile as UserProfile);
      setLocation('/');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    } else {
      setLocation('/');
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills?.includes(skillInput.trim())) {
      setProfile({ ...profile, skills: [...(profile.skills || []), skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (s: string) => {
    setProfile({ ...profile, skills: profile.skills?.filter(x => x !== s) });
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left side - Visuals */}
      <div className="hidden lg:flex w-1/2 relative">
        <img 
          src="/images/city-1.jpg" 
          alt="City view" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background"></div>
        
        <div className="absolute bottom-12 left-12 max-w-md reveal-3">
          <div className="glass-panel p-6 rounded-2xl">
            <Shield className="text-primary mb-4" size={28} />
            <h2 className="font-serif text-2xl text-foreground mb-2">Signal, not noise.</h2>
            <p className="text-muted-foreground text-sm">Your profile is the baseline for serendipity. We use this to detect meaningful intersections in your orbit without compromising your privacy.</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 py-8 md:px-16 md:py-12 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="font-mono-custom text-xs tracking-widest text-muted-foreground">
            STEP {currentStep + 1} OF {steps.length}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {currentStep === 0 && (
            <div className="fade-in">
              <Target className="text-accent mb-6" size={32} />
              <h1 className="font-serif text-4xl text-foreground mb-4">What brings you here?</h1>
              <p className="text-muted-foreground mb-8">Define your current professional intent. This is the strongest signal we use to match you with others.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Your Current Role</label>
                  <input 
                    type="text" 
                    value={profile.role}
                    onChange={e => setProfile({...profile, role: e.target.value})}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Your Intent</label>
                  <textarea 
                    value={profile.intent}
                    onChange={e => setProfile({...profile, intent: e.target.value})}
                    rows={4}
                    placeholder="E.g. Looking to join an early-stage team in climate..."
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="fade-in">
              <Compass className="text-primary mb-6" size={32} />
              <h1 className="font-serif text-4xl text-foreground mb-4">Define your expertise.</h1>
              <p className="text-muted-foreground mb-8">Add specific skills and knowledge areas. The more precise you are, the higher the signal quality.</p>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="E.g. Systems Architecture"
                    className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button onClick={addSkill} className="bg-white/10 hover:bg-white/20 text-foreground px-6 rounded-xl font-medium transition-colors">
                    Add
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-6">
                  {profile.skills?.length === 0 && <span className="text-muted-foreground text-sm italic">No skills added yet.</span>}
                  {profile.skills?.map(s => (
                    <span key={s} className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm">
                      {s} <button onClick={() => removeSkill(s)} className="hover:text-foreground"><X size={14}/></button>
                    </span>
                  ))}
                  {/* Suggestions */}
                  {profile.skills?.length === 0 && ['Product Strategy', 'Climate Tech', 'Go-to-market', 'Systems Design'].map(s => (
                    <button key={s} onClick={() => setProfile({...profile, skills: [...(profile.skills||[]), s]})} className="flex items-center gap-2 bg-white/5 border border-border text-muted-foreground hover:text-foreground hover:border-white/20 px-3 py-1.5 rounded-full text-sm transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="fade-in">
              <Lock className="text-accent mb-6" size={32} />
              <h1 className="font-serif text-4xl text-foreground mb-4">Control your exposure.</h1>
              <p className="text-muted-foreground mb-8">Choose how much context to reveal before mutual consent. Your name and exact company are always hidden by default.</p>
              
              <div className="space-y-4">
                {[
                  { id: 'strict', label: 'Strict', desc: 'Only reveal intent and general skills. Heavily obscure image.' },
                  { id: 'balanced', label: 'Balanced', desc: 'Reveal general role, industry, and approximate location.' },
                  { id: 'open', label: 'Open', desc: 'Reveal past experience themes and clearer professional context.' }
                ].map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => setProfile({...profile, privacyLevel: opt.id as any})}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      profile.privacyLevel === opt.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border bg-card hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-foreground">{opt.label}</span>
                      {profile.privacyLevel === opt.id && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>}
                    </div>
                    <span className="text-sm text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="fade-in text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8">
                <Shield className="text-primary" size={40} />
              </div>
              <h1 className="font-serif text-4xl text-foreground mb-4">Signal calibrated.</h1>
              <p className="text-muted-foreground mb-8 max-w-md">Your radar is active. We are now scanning for meaningful intersections in your professional orbit.</p>
              
              <div className="w-full max-w-sm glass-panel p-6 rounded-2xl text-left border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-serif font-bold">
                    {profile.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Protected Professional</div>
                    <div className="text-xs text-muted-foreground">{profile.role}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground border-t border-white/5 pt-4">
                  "{profile.intent}"
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-end pt-6 border-t border-border">
          <button 
            onClick={handleNext}
            className="flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-full font-medium hover:bg-foreground/90 transition-all active:scale-95"
          >
            {currentStep === steps.length - 1 ? 'Enter Radar' : 'Continue'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
