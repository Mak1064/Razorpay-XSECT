import { Check, Sparkles, Workflow } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getGetBillingSubscriptionQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { adminMeQueryKey, type Plan } from '../hooks/use-admin';
import { useStore } from '../store';

const plans = [
  {
    id: 'free' as const,
    name: 'Base Signal',
    description: 'Essential discovery for active professionals.',
    icon: null,
    features: ['Local radar discovery', 'Protected professional profiles', 'Receive connection requests', '5 outbound requests per day'],
  },
  {
    id: 'pro' as const,
    name: 'XSECT Pro',
    description: 'Advanced opportunity discovery.',
    icon: Workflow,
    features: ['Everything in Base', 'Unlimited XSECTs', 'Standing alerts', 'Time XSECTs', 'Full intelligence and two-step paths'],
  },
  {
    id: 'pro_plus' as const,
    name: 'Pro+',
    description: 'Complete intelligence and network tools.',
    icon: Sparkles,
    features: ['Everything in Pro', 'Opportunity Map', 'Event mode', 'AI Agent', 'Professional Twin auto-refresh and multi-step paths'],
  },
];

export default function Plans() {
  const { state } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const demoSwitch = useMutation({
    mutationFn: async (plan: Plan) => {
      const response = await fetch('/api/billing-demo/plan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Unable to switch plan.');
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBillingSubscriptionQueryKey() }),
        queryClient.invalidateQueries({ queryKey: adminMeQueryKey }),
      ]);
      toast({ title: 'Plan switched', description: 'Your feature access now follows the selected demo plan.' });
    },
    onError: (error) => toast({ title: 'Unable to switch plan', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }),
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <header className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Choose your signal level.</h1>
        <p className="text-lg text-muted-foreground">Payments are disabled. Switch plans here to preview and test every entitlement.</p>
      </header>
      <section className="mb-10 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
        <p className="text-xs font-mono-custom uppercase tracking-widest text-amber-800 font-semibold mb-3">Demo access</p>
        <div className="inline-flex rounded-lg border border-amber-300 bg-white p-1">
          {([['free', 'Free'], ['pro', 'Pro'], ['pro_plus', 'Pro+']] as const).map(([plan, label]) => (
            <button key={plan} disabled={demoSwitch.isPending} onClick={() => demoSwitch.mutate(plan)}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${state.plan === plan ? 'bg-amber-700 text-white' : 'text-amber-900 hover:bg-amber-100'} disabled:opacity-50`}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const active = state.plan === plan.id;
          return (
            <section key={plan.id} className={`border rounded-2xl p-8 flex flex-col relative ${plan.id === 'pro' ? 'bg-foreground text-background border-foreground shadow-xl' : 'bg-white border-border'}`}>
              {active && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-mono-custom font-semibold">CURRENT PLAN</div>}
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">{plan.name}{Icon && <Icon size={18} className="text-primary" />}</h2>
              <p className="text-sm text-muted-foreground min-h-10">{plan.description}</p>
              <ul className="space-y-4 my-8 flex-1">
                {plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm"><Check size={18} className="text-primary shrink-0" />{feature}</li>)}
              </ul>
              <button disabled={active || demoSwitch.isPending} onClick={() => demoSwitch.mutate(plan.id)}
                className={`w-full py-3 rounded-lg font-bold disabled:opacity-50 ${plan.id === 'pro' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary'}`}>
                {active ? 'Active' : `Use ${plan.name}`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}