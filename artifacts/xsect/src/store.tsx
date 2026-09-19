import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  intent: string;
  skills: string[];
  location: string;
  privacyLevel: 'strict' | 'balanced' | 'open';
}

export interface StoreState {
  onboardingComplete: boolean;
  profile: UserProfile | null;
  savedOpportunities: string[];
  connectionsRequested: string[];
  connectionsAccepted: string[];
  unlockedIdentities: string[];
  
  // Plans
  plan: 'free' | 'pro' | 'pro_plus';
  billingCycle: 'monthly' | 'annual';
  billingStatus: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'paused';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: string[];
  
  // Geolocation (in-memory)
  locationTracking: 'idle' | 'tracking' | 'paused' | 'error';
  locationAccuracy: number | null;
}

interface StoreContextType {
  state: StoreState;
  completeOnboarding: (profile: UserProfile) => void;
  saveOpportunity: (id: string) => void;
  requestConnection: (id: string) => void;
  acceptConnection: (id: string) => void;
  unlockIdentity: (id: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  
  syncBilling: (billing: Pick<StoreState, 'plan' | 'billingCycle' | 'billingStatus' | 'currentPeriodEnd' | 'cancelAtPeriodEnd' | 'entitlements'>) => void;
  
  // Geolocation
  setLocationTrackingStatus: (status: StoreState['locationTracking'], accuracy?: number | null) => void;
}

const initialState: StoreState = {
  onboardingComplete: false,
  profile: null,
  savedOpportunities: [],
  connectionsRequested: [],
  connectionsAccepted: [],
  unlockedIdentities: [],
  plan: 'free',
  billingCycle: 'monthly',
  billingStatus: 'free',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  entitlements: [],
  locationTracking: 'idle',
  locationAccuracy: null
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);

  const completeOnboarding = (profile: UserProfile) => setState(s => ({ ...s, onboardingComplete: true, profile }));
  
  const saveOpportunity = (id: string) => setState(s => ({
    ...s, 
    savedOpportunities: s.savedOpportunities.includes(id) 
      ? s.savedOpportunities.filter(i => i !== id) 
      : [...s.savedOpportunities, id]
  }));
  
  const requestConnection = (id: string) => setState(s => ({
    ...s,
    connectionsRequested: [...s.connectionsRequested, id]
  }));
  
  const acceptConnection = (id: string) => setState(s => ({
    ...s,
    connectionsAccepted: [...s.connectionsAccepted, id],
    unlockedIdentities: [...s.unlockedIdentities, id]
  }));
  
  const unlockIdentity = (id: string) => setState(s => ({
    ...s,
    unlockedIdentities: Array.from(new Set([...s.unlockedIdentities, id]))
  }));
  
  const updateProfile = (profile: Partial<UserProfile>) => setState(s => ({
    ...s,
    profile: s.profile ? { ...s.profile, ...profile } : null
  }));

  const syncBilling: StoreContextType['syncBilling'] = useCallback((billing) => setState(s => ({
    ...s,
    ...billing,
  })), []);

  const setLocationTrackingStatus = (status: StoreState['locationTracking'], accuracy?: number | null) => setState(s => ({
    ...s,
    locationTracking: status,
    locationAccuracy: accuracy !== undefined ? accuracy : s.locationAccuracy
  }));

  return (
    <StoreContext.Provider value={{
      state, completeOnboarding, saveOpportunity, 
      requestConnection, acceptConnection, unlockIdentity, 
      updateProfile, syncBilling, setLocationTrackingStatus
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore must be used within StoreProvider');
  return context;
};
