import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

  // Sign in anonymously (for wallet-only users)
  const signInWithWallet = async (walletAddress) => {
    const result = await supabase.auth.signInAnonymously();
    if (result.data?.user && walletAddress) {
      // Save wallet address to profile
      await supabase
        .from('profiles')
        .update({
          display_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        })
        .eq('id', result.data.user.id);
    }
    return result;
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{
      user, loading,
      signUp, signIn, signInWithGoogle, signInWithWallet, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
