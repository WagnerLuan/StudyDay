"use client";

import * as React from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface SupabaseContextType {
  session: Session | null;
  isLoading: boolean;
}

const SupabaseContext = React.createContext<SupabaseContextType | undefined>(undefined);

export const useSupabase = () => {
  const context = React.useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

interface SupabaseProviderProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children, initialSession }) => {
  const [session, setSession] = React.useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsLoading(false);
    });

    // Check initial session if not provided
    if (!initialSession) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [initialSession]);

  const contextValue = React.useMemo(() => ({ session, isLoading }), [session, isLoading]);

  return (
    <SupabaseContext.Provider value={contextValue}>
      {children}
    </SupabaseContext.Provider>
  );
};

export default SupabaseProvider;