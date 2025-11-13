import { supabase, type UserRole } from './supabase';

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: role
  });

  if (error) {
    console.error('Error checking role:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user has a specific role for a department
 */
export async function hasRoleForDepartment(
  userId: string, 
  role: UserRole, 
  departmentId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role_for_department', {
    _user_id: userId,
    _role: role,
    _department_id: departmentId
  });

  if (error) {
    console.error('Error checking role for department:', error);
    return false;
  }

  return data || false;
}

/**
 * Get user's department for their dept_admin role
 */
export async function getUserDeptAdminDepartment(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_user_dept_admin_department', {
    _user_id: userId
  });

  if (error) {
    console.error('Error getting dept admin department:', error);
    return null;
  }

  return data;
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, department_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user is dept admin (client-side helper using loaded roles)
 */
export function isDeptAdmin(roles: Array<{ role: UserRole; department_id: string | null }>): boolean {
  return roles.some(r => r.role === 'dept_admin');
}

/**
 * Get dept admin's department ID (client-side helper using loaded roles)
 */
export function getDeptAdminDepartment(roles: Array<{ role: UserRole; department_id: string | null }>): string | null {
  const deptAdminRole = roles.find(r => r.role === 'dept_admin');
  return deptAdminRole?.department_id || null;
}

/**
 * Check if user is main admin (client-side helper using loaded roles)
 */
export function isMainAdmin(roles: Array<{ role: UserRole; department_id: string | null }>): boolean {
  return roles.some(r => r.role === 'main_admin');
}

/**
 * Check if user is student (client-side helper using loaded roles)
 */
export function isStudent(roles: Array<{ role: UserRole; department_id: string | null }>): boolean {
  return roles.some(r => r.role === 'student');
}
