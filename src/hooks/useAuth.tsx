import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthContextValue {
  /** The signed-in account; null for visitors and for anonymous (guest) sessions. */
  user: User | null;
  /** Guest session started on the memorial creation page, before the visitor registers. */
  guestUser: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Only internal paths are allowed as post-login redirect (open redirect protection). */
export const safeRedirect = (value: string | null | undefined, fallback = '/moji-memorijali') => {
  if (!value) return fallback;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith('/')) return fallback;
  if (decoded.startsWith('//')) return fallback;
  if (decoded.includes('://') || decoded.includes('\\')) return fallback;
  return decoded;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestUser, setGuestUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    // Links this account to a pending administrator record (no-op for everyone else).
    try {
      await supabase.rpc('claim_admin_role');
    } catch {
      /* never block loading the profile */
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, avatar_url, phone').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setProfile((prof as Profile) ?? null);
    setIsAdmin(Boolean(roles?.some((r) => r.role === 'admin')));
  }, []);

  // Guest sessions stay out of `user`, so the rest of the site still treats them as signed out.
  const applyUser = useCallback((u: User | null) => {
    setUser(u && !u.is_anonymous ? u : null);
    setGuestUser(u?.is_anonymous ? u : null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      applyUser(newSession?.user ?? null);
      setLoading(false);
      if (newSession?.user && !newSession.user.is_anonymous) {
        setTimeout(() => { loadProfile(newSession.user.id); }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      applyUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user && !data.session.user.is_anonymous) loadProfile(data.session.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, applyUser]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setGuestUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };


  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, guestUser, session, profile, loading, isAdmin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const displayName = (profile: Profile | null, user: User | null) => {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  return profile?.email || user?.email || 'Korisnik';
};

export const initials = (profile: Profile | null, user: User | null) => {
  const name = displayName(profile, user);
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
};
