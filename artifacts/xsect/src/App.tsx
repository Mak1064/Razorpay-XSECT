import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

import { StoreProvider, useStore } from './store';

// Components
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

const queryClient = new QueryClient();

function AppRoutes() {
  const { state } = useStore();
  
  if (!state.isLoggedIn) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/onboarding" component={Onboarding} />
        <Route>
          <Landing />
        </Route>
      </Switch>
    );
  }
  
  if (!state.onboardingComplete) {
    return (
      <Switch>
        <Route component={Onboarding} />
      </Switch>
    );
  }

  return (
    <Shell>
      <Switch>
        <Route path="/" component={Radar} />
        <Route path="/discover" component={Discover} />
        <Route path="/xsects" component={XSECTs} />
        <Route path="/network" component={NetworkPage} />
        <Route path="/ai" component={Intelligence} />
        <Route path="/events" component={EventsPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <RoutedErrorBoundary>
              <div className="dark min-h-[100dvh] w-full text-foreground bg-background font-sans selection:bg-primary selection:text-primary-foreground">
                <AppRoutes />
              </div>
            </RoutedErrorBoundary>
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
