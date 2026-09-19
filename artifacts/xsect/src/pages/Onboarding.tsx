import { useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '../store';
import { useUser } from '@clerk/react';
import { Shield, Target, User as UserIcon } from 'lucide-react';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { completeOnboarding } = useStore();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    name: string;
    role: string;
    intent: string;
    skills: string;
    privacyLevel: 'strict' | 'balanced' | 'open';
  }>({
    name: user?.fullName || '',
    role: '',
    intent: '',
    skills: '',
    privacyLevel: 'balanced',
  });

  const handleComplete = () => {
    completeOnboarding({
      name: formData.name || 'Anonymous',
      role: formData.role,
      intent: formData.intent,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      location: 'Determining...',
      privacyLevel: formData.privacyLevel
    });
    setLocation('/radar');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="XSECT" className="w-6 h-6" />
          <span className="font-bold tracking-tight">XSECT</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-sm p-8">
          <div className="mb-8">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-secondary'}`} />
              ))}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {step === 1 && "Establish your baseline."}
              {step === 2 && "Declare your intent."}
              {step === 3 && "Set your exposure."}
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === 1 && "This information forms the core of your signal."}
              {step === 2 && "What are you actively looking for right now?"}
              {step === 3 && "Control how much of your identity is visible on radar."}
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Primary Role</label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Senior Staff Engineer"
                />
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.role}
                className="w-full bg-foreground text-background py-2.5 rounded-md font-medium disabled:opacity-50 mt-6"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Current Intent</label>
                <textarea
                  value={formData.intent}
                  onChange={e => setFormData({ ...formData, intent: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                  placeholder="Looking for a founding engineer role in climate tech..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Core Skills (comma separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={e => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="React, Distributed Systems, Go"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-md font-medium"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!formData.intent}
                  className="flex-1 bg-foreground text-background py-2.5 rounded-md font-medium disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label 
                  className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.privacyLevel === 'strict' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                >
                  <input 
                    type="radio" 
                    name="privacy" 
                    checked={formData.privacyLevel === 'strict'}
                    onChange={() => setFormData({ ...formData, privacyLevel: 'strict' })}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2"><Shield size={16} /> Strict</div>
                    <div className="text-sm text-muted-foreground mt-1">Only intent and skills visible. Role and name hidden until accepted.</div>
                  </div>
                </label>
                
                <label 
                  className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.privacyLevel === 'balanced' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                >
                  <input 
                    type="radio" 
                    name="privacy" 
                    checked={formData.privacyLevel === 'balanced'}
                    onChange={() => setFormData({ ...formData, privacyLevel: 'balanced' })}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2"><Target size={16} /> Balanced</div>
                    <div className="text-sm text-muted-foreground mt-1">Role category visible. Name hidden until accepted.</div>
                  </div>
                </label>

                <label 
                  className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.privacyLevel === 'open' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}
                >
                  <input 
                    type="radio" 
                    name="privacy" 
                    checked={formData.privacyLevel === 'open'}
                    onChange={() => setFormData({ ...formData, privacyLevel: 'open' })}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2"><UserIcon size={16} /> Open</div>
                    <div className="text-sm text-muted-foreground mt-1">Role and initial visible to nearby matches.</div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-md font-medium"
                >
                  Back
                </button>
                <button 
                  onClick={handleComplete}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  Initialize Signal
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
