import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for database tables
export type UserRole = 'student' | 'teacher' | 'dept_admin' | 'main_admin';
export type TicketStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_no: string;
  student_id: string;
  title: string;
  body: string;
  predicted_category: string | null;
  predicted_confidence: number | null;
  category_overridden: boolean;
  department_id: string | null;
  status: TicketStatus;
  priority: PriorityLevel;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  ticket_id: string;
  from_status: TicketStatus | null;
  to_status: TicketStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface UserRoleEntry {
  id: string;
  user_id: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}
