import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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

function AppRoutes() {
  const { state } = useStore();
  const { isLoaded, isSignedIn } = useUser();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => (
        <>
          <Show when="signed-in">
            {!state.onboardingComplete ? <Redirect to="/onboarding" /> : <Redirect to="/radar" />}
          </Show>
          <Show when="signed-out">
            <Landing />
          </Show>
        </>
      )} />
      
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Protected Routes Wrapper */}
      <Route path="/:rest*">
        <Show when="signed-out">
          <Redirect to="/sign-in" />
        </Show>
        <Show when="signed-in">
          {(!state.onboardingComplete && location !== '/onboarding') ? (
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
            <RoutedErrorBoundary>
              <div className="min-h-[100dvh] w-full text-foreground bg-background font-sans selection:bg-primary/20 selection:text-primary">
                <AppRoutes />
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
