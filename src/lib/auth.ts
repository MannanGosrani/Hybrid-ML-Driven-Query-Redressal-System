import { supabase, type UserRole, type Profile } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string, fullName: string, role: UserRole = 'student') {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        role: role
      }
    }
  });
  
  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}

/**
 * Check if user has specific role
 */
export function hasRole(profile: Profile | null, roles: UserRole[]): boolean {
  if (!profile) return false;
  return roles.includes(profile.role);
}

/**
 * Check if user is student
 */
export function isStudent(profile: Profile | null): boolean {
  return hasRole(profile, ['student']);
}

/**
 * Check if user is teacher
 */
export function isTeacher(profile: Profile | null): boolean {
  return hasRole(profile, ['teacher']);
}

/**
 * Check if user is department admin
 */
export function isDeptAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['dept_admin']);
}

/**
 * Check if user is main admin
 */
export function isMainAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['main_admin']);
}

/**
 * Check if user is any type of admin
 */
export function isAnyAdmin(profile: Profile | null): boolean {
  return hasRole(profile, ['dept_admin', 'main_admin']);
}

/**
 * Check if user is staff (teacher, dept admin, or main admin)
 */
export function isStaff(profile: Profile | null): boolean {
  return hasRole(profile, ['teacher', 'dept_admin', 'main_admin']);
}
