import { createContext, useContext, useState, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  intent: string;
  skills: string[];
  location: string;
  privacyLevel: 'strict' | 'balanced' | 'open';
}

export interface StoreState {
  isLoggedIn: boolean;
  onboardingComplete: boolean;
  profile: UserProfile | null;
  savedOpportunities: string[];
  connectionsRequested: string[];
  connectionsAccepted: string[];
  unlockedIdentities: string[];
  hasUpgraded: boolean;
}

interface StoreContextType {
  state: StoreState;
  login: () => void;
  completeOnboarding: (profile: UserProfile) => void;
  logout: () => void;
  saveOpportunity: (id: string) => void;
  requestConnection: (id: string) => void;
  acceptConnection: (id: string) => void;
  unlockIdentity: (id: string) => void;
  upgradeToPremium: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const initialState: StoreState = {
  isLoggedIn: false,
  onboardingComplete: false,
  profile: null,
  savedOpportunities: [],
  connectionsRequested: [],
  connectionsAccepted: [],
  unlockedIdentities: [],
  hasUpgraded: false,
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);

  const login = () => setState(s => ({ ...s, isLoggedIn: true }));
  
  const completeOnboarding = (profile: UserProfile) => setState(s => ({ ...s, onboardingComplete: true, profile, isLoggedIn: true }));
  
  const logout = () => setState(initialState);
  
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
  
  const upgradeToPremium = () => setState(s => ({ ...s, hasUpgraded: true }));
  
  const updateProfile = (profile: Partial<UserProfile>) => setState(s => ({
    ...s,
    profile: s.profile ? { ...s.profile, ...profile } : null
  }));

  return (
    <StoreContext.Provider value={{
      state, login, completeOnboarding, logout, saveOpportunity, 
      requestConnection, acceptConnection, unlockIdentity, upgradeToPremium, updateProfile
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
