import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';
import { getUserProfile } from '@/lib/auth';

interface UserRoleInfo {
  role: UserRole;
  department_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRoles: UserRoleInfo[];
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  userRoles: [],
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile and roles when user logs in
        if (session?.user) {
          setTimeout(async () => {
            const userProfile = await getUserProfile(session.user.id);
            setProfile(userProfile);
            
            // Load user roles
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role, department_id')
              .eq('user_id', session.user.id);
            
            setUserRoles(rolesData || []);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setUserRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await getUserProfile(session.user.id);
        setProfile(userProfile);
        
        // Load user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role, department_id')
          .eq('user_id', session.user.id);
        
        setUserRoles(rolesData || []);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, userRoles, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
