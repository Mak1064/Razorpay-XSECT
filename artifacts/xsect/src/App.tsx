import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';

import { StoreProvider, useStore } from './store';
import Shell from './components/Shell';

// Pages
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Radar from './pages/Radar';
import Discover from './pages/Discover';
import XSECTs from './pages/XSECTs';
import NetworkPage from './pages/Network';
import Intelligence from './pages/Intelligence';
import EventsPage from './pages/Events';
import MessagesPage from './pages/Messages';
import Profile from './pages/Profile';
import Plans from './pages/Plans';
import NotFound from './pages/not-found';
import Opportunities from './pages/Opportunities';
import Organizations from './pages/Organizations';
import OrganizationDetail from './pages/OrganizationDetail';
import Paths from './pages/Paths';
import Alerts from './pages/Alerts';
import Admin from './pages/Admin';
import { PrivacyNotice, Terms } from './pages/Legal';
import PrivacyCenter from './pages/PrivacyCenter';
import { useProfile } from './hooks/use-profile';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(14 90% 55%)",
    colorForeground: "hsl(220 30% 12%)",
    colorMutedForeground: "hsl(220 10% 40%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(40 10% 95%)",
    colorInputForeground: "hsl(220 30% 12%)",
    colorNeutral: "hsl(40 10% 88%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(40,10%,82%)] shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "!text-[hsl(220,30%,12%)] !font-bold",
    headerSubtitle: "!text-[hsl(220,10%,36%)]",
    socialButtonsBlockButton: "!border !border-[hsl(220,15%,78%)] !bg-white hover:!bg-[hsl(40,10%,96%)]",
    socialButtonsBlockButtonText: "!text-[hsl(220,30%,12%)] !font-semibold",
    formFieldLabel: "!text-[hsl(220,30%,12%)] !font-semibold",
    formFieldInput: "!bg-[hsl(40,10%,96%)] !text-[hsl(220,30%,12%)] !border-[hsl(220,15%,78%)]",
    formButtonPrimary: "!bg-[hsl(14,90%,55%)] !text-white hover:!bg-[hsl(14,90%,48%)]",
    footerActionLink: "!text-[hsl(14,90%,45%)] !font-semibold",
    footerActionText: "!text-[hsl(220,10%,36%)]",
    dividerText: "!text-[hsl(220,10%,36%)]",
    dividerLine: "!bg-[hsl(220,15%,82%)]",
    identityPreviewEditButton: "!text-[hsl(14,90%,45%)]",
    formFieldSuccessText: "!text-emerald-700",
    alertText: "!text-[hsl(220,30%,12%)]",
    logoBox: "!h-14",
    logoImage: "!h-12",
    footerAction: "!bg-transparent",
    alert: "!bg-[hsl(40,10%,96%)]",
    otpCodeFieldInput: "!text-[hsl(220,30%,12%)] !border-[hsl(220,15%,78%)]",
    main: "!gap-5",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ConsentPrompt() {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState({ terms: false, privacy: false, age18: false });
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/privacy/consents', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(data => {
      if (!data || !data.terms || !data.privacy || !data.age18) setOpen(true);
    }).catch(() => undefined);
  }, [isSignedIn]);
  if (!open) return null;
  const save = async () => {
    if (!consent.terms || !consent.privacy || !consent.age18) return;
    const r = await fetch('/api/privacy/consents', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...consent, location: false, analytics: false, aiProfiling: false, marketing: false }) });
    if (r.ok) setOpen(false);
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Before you continue</h2><p className="mt-2 text-sm text-muted-foreground">XSECT is for people aged 18+. Please review and accept our required terms. Optional processing stays off unless you enable it in Privacy Center.</p>{(['terms','privacy','age18'] as const).map(k => <label key={k} className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={consent[k]} onChange={() => setConsent({ ...consent, [k]: !consent[k] })} />{k === 'terms' ? <span>I agree to the <a className="text-primary" href="/terms">Terms of Service</a>.</span> : k === 'privacy' ? <span>I acknowledge the <a className="text-primary" href="/privacy">Privacy Notice</a>.</span> : 'I confirm I am 18 or older.'}</label>)}<button onClick={save} disabled={!consent.terms || !consent.privacy || !consent.age18} className="mt-6 w-full rounded-md bg-primary px-4 py-3 font-semibold text-white disabled:opacity-40">Continue</button><a href="/privacy-center" className="mt-3 block text-center text-sm text-primary">Manage optional choices</a></div></div>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

export const accessPlanQueryKey = ['access-plan'] as const;

function PlanAccessSynchronizer() {
  const { isSignedIn } = useUser();
  const { syncPlanAccess } = useStore();
  const { data } = useQuery({
    queryKey: accessPlanQueryKey,
    enabled: Boolean(isSignedIn),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch('/api/access/plan', { credentials: 'include' });
      if (!response.ok) throw new Error('Unable to load plan access.');
      return response.json() as Promise<{ plan: 'free' | 'pro' | 'pro_plus'; source: 'free' | 'override'; entitlements: string[] }>;
    },
  });

  useEffect(() => {
    if (!data) return;
    syncPlanAccess({
      plan: data.plan,
      planSource: data.source,
      entitlements: data.entitlements,
    });
  }, [data, syncPlanAccess]);

  return null;
}

function AppRoutes() {
  const { state } = useStore();
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();
  const { data: serverProfile, isLoading: profileLoading } = useProfile(Boolean(isSignedIn));

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (isSignedIn && profileLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }
  const onboardingComplete = Boolean(serverProfile?.onboardingComplete || state.onboardingComplete);

  return (
    <Switch>
      <Route path="/" component={() => (
        <>
          <Show when="signed-in">
            {!onboardingComplete ? <Redirect to="/onboarding" /> : <Redirect to="/radar" />}
          </Show>
          <Show when="signed-out">
            <Landing />
          </Show>
        </>
      )} />
      
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/privacy" component={PrivacyNotice} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy-center" component={PrivacyCenter} />

      {/* Protected Routes Wrapper */}
      <Route path="/:rest*">
        <Show when="signed-out">
          <Redirect to="/sign-in" />
        </Show>
        <Show when="signed-in">
          {(!onboardingComplete && location !== '/onboarding') ? (
            <Redirect to="/onboarding" />
          ) : (
            <Switch>
              <Route path="/onboarding" component={Onboarding} />
              <Route path="/radar" component={() => <Shell><Radar /></Shell>} />
              <Route path="/discover" component={() => <Shell><Discover /></Shell>} />
              <Route path="/xsects" component={() => <Shell><XSECTs /></Shell>} />
              <Route path="/network" component={() => <Shell><NetworkPage /></Shell>} />
              <Route path="/ai" component={() => <Shell><Intelligence /></Shell>} />
              <Route path="/events" component={() => <Shell><EventsPage /></Shell>} />
              <Route path="/messages" component={() => <Shell><MessagesPage /></Shell>} />
              <Route path="/profile" component={() => <Shell><Profile /></Shell>} />
              <Route path="/plans" component={() => <Shell><Plans /></Shell>} />
              <Route path="/opportunities" component={() => <Shell><Opportunities /></Shell>} />
              <Route path="/organizations" component={() => <Shell><Organizations /></Shell>} />
              <Route path="/organizations/:id" component={() => <Shell><OrganizationDetail /></Shell>} />
              <Route path="/paths" component={() => <Shell><Paths /></Shell>} />
              <Route path="/alerts" component={() => <Shell><Alerts /></Shell>} />
              <Route path="/admin" component={() => <Shell><Admin /></Shell>} />
              <Route component={() => <Shell><NotFound /></Shell>} />
            </Switch>
          )}
        </Show>
      </Route>
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Sign in to XSECT",
            subtitle: "Continue to your opportunity radar",
          },
        },
        signUp: {
          start: {
            title: "Join the XSECT network",
            subtitle: "Create your professional signal",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <StoreProvider>
            <PlanAccessSynchronizer />
            <RoutedErrorBoundary>
              <div className="min-h-[100dvh] w-full text-foreground bg-background font-sans selection:bg-primary/20 selection:text-primary">
                <AppRoutes />
                <ConsentPrompt />
              </div>
            </RoutedErrorBoundary>
          </StoreProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) {
    return <div>Missing VITE_CLERK_PUBLISHABLE_KEY</div>;
  }

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
      <Toaster />
    </WouterRouter>
  );
}

export default App;
