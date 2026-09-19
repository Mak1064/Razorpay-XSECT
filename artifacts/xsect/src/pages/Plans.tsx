import { useStore } from '../store';
import { Check, CreditCard, Info, Sparkles, Workflow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getGetBillingSubscriptionQueryKey, useCreateBillingCheckout, useCreateBillingPortal } from '@workspace/api-client-react';
import { adminMeQueryKey, type Plan } from '../hooks/use-admin';

export default function Plans() {
  const { state } = useStore();
  const { toast } = useToast();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const queryClient = useQueryClient();
  const checkout = useCreateBillingCheckout();
  const portal = useCreateBillingPortal();
  const demoSwitch = useMutation({
    mutationFn: async (plan: Plan) => {
      const response = await fetch('/api/billing-demo/plan', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Unable to switch demo plan.');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBillingSubscriptionQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminMeQueryKey }),
      ]);
      toast({ title: 'Demo plan switched', description: 'Entitlements now follow the selected demo plan.' });
    },
    onError: (error) => toast({ title: 'Unable to switch demo plan', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }),
  });
  const isRedirecting = checkout.isPending || portal.isPending;

  const openPortal = async () => {
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

  const handleCheckout = async (plan: 'pro' | 'pro_plus') => {
    if (state.plan !== 'free') {
      await openPortal();
      return;
    }

    try {
      const result = await checkout.mutateAsync({ data: { plan, cycle } });
      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: 'Checkout unavailable',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto h-full flex flex-col">
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Amplify your signal.
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          The right connections shouldn't be left to chance. Upgrade to unlock intelligence routing, advanced path discovery, and stealth controls.
        </p>

        <div className="inline-flex items-center p-1 bg-secondary rounded-lg border border-border">
          <button 
            onClick={() => setCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${cycle === 'monthly' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setCycle('annual')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${cycle === 'annual' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Annual <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono-custom uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </header>

      <section className="mb-10 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
        <p className="text-xs font-mono-custom uppercase tracking-widest text-amber-800 font-semibold mb-3">Demo mode: switch plan</p>
        <p className="text-sm text-amber-900/80 mb-4">Preview plan entitlements without changing your Stripe subscription.</p>
        <div className="inline-flex rounded-lg border border-amber-300 bg-white p-1">
          {([['free', 'Free'], ['pro', 'Pro'], ['pro_plus', 'Pro+']] as const).map(([plan, label]) => (
            <button
              key={plan}
              disabled={demoSwitch.isPending}
              onClick={() => demoSwitch.mutate(plan)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${state.plan === plan ? 'bg-amber-700 text-white' : 'text-amber-900 hover:bg-amber-100'} disabled:opacity-50`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Free Plan */}
        <div className="bg-white border border-border rounded-2xl p-8 flex flex-col relative">
          {state.plan === 'free' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary border border-border px-3 py-1 rounded-full text-xs font-mono-custom font-semibold">CURRENT PLAN</div>}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2">Base Signal</h3>
            <p className="text-muted-foreground text-sm h-10">Essential discovery for active professionals.</p>
            <div className="text-4xl font-bold mt-4">$0<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> Local radar discovery</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> Basic zero-knowledge profiles</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> Receive connection requests</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> 5 outbound requests/mo</li>
          </ul>
          <button 
            disabled={state.plan === 'free'}
            onClick={openPortal}
            className="w-full py-3 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.plan === 'free' ? 'Active' : 'Manage or cancel'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-foreground text-background border border-foreground rounded-2xl p-8 flex flex-col relative scale-105 shadow-xl z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent rounded-2xl pointer-events-none"></div>
          {state.plan === 'pro' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-mono-custom font-semibold">CURRENT PLAN</div>}
          <div className="mb-8 relative">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">XSECT Pro <Workflow size={18} className="text-primary"/></h3>
            <p className="text-muted-foreground text-sm h-10">For those actively hunting specific opportunities.</p>
            <div className="text-4xl font-bold mt-4">
              ${cycle === 'monthly' ? '9.99' : '99'}<span className="text-lg text-muted-foreground font-normal">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-1 relative">
            <li className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" /> Everything in Base</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" /> Advanced intent filters</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" /> Unlimited connection requests</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" /> Priority radar placement</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" /> Read receipts on messages</li>
          </ul>
          <button 
            disabled={isRedirecting || state.plan === 'pro'}
            onClick={() => handleCheckout('pro')}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            {state.plan === 'pro' ? 'Active' : state.plan === 'free' ? 'Start Pro checkout' : 'Change in billing portal'}
          </button>
        </div>

        {/* Pro+ Plan */}
        <div className="bg-white border border-border rounded-2xl p-8 flex flex-col relative">
          {state.plan === 'pro_plus' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary border border-border px-3 py-1 rounded-full text-xs font-mono-custom font-semibold">CURRENT PLAN</div>}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">Pro+ <Sparkles size={18} className="text-accent" /></h3>
            <p className="text-muted-foreground text-sm h-10">AI intelligence and absolute privacy controls.</p>
            <div className="text-4xl font-bold mt-4">
              ${cycle === 'monthly' ? '24.99' : '249'}<span className="text-lg text-muted-foreground font-normal">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> Everything in Pro</li>
            <li className="flex gap-3 text-sm font-medium"><Check size={18} className="text-accent shrink-0" /> XSECT Intelligence API</li>
            <li className="flex gap-3 text-sm"><Check size={18} className="text-muted-foreground shrink-0" /> Standing signal alerts</li>
            <li className="flex gap-3 text-sm flex-col">
              <div className="flex gap-3"><Check size={18} className="text-muted-foreground shrink-0" /> Complete Stealth Mode</div>
              <div className="text-xs text-muted-foreground ml-7">Browse radar invisibly</div>
            </li>
          </ul>
          <button 
            disabled={isRedirecting || state.plan === 'pro_plus'}
            onClick={() => handleCheckout('pro_plus')}
            className="w-full py-3 rounded-lg border-2 border-foreground text-foreground font-bold hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.plan === 'pro_plus' ? 'Active' : state.plan === 'free' ? 'Start Pro+ checkout' : 'Change in billing portal'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground max-w-lg mx-auto flex items-center justify-center gap-2">
        <CreditCard size={14} /> <span>Secure recurring billing is processed by Stripe. Cancel or update payment details from your billing portal.</span>
      </div>
    </div>
  );
}
