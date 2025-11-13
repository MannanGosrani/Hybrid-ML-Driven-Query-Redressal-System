# Complete SQL Migration Scripts

Run these in order in your Supabase SQL Editor.

---

## Migration 1: Initial Schema

```sql
-- NMIMS Grievance Redressal System - Initial Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMS
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'dept_admin', 'main_admin');
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_REVIEW', 'IN_PROGRESS', 'AWAITING_STUDENT', 'RESOLVED', 'CLOSED', 'REOPENED');
CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Profiles Table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  department_id uuid NULL,
  created_at timestamptz DEFAULT now()
);

-- Departments Table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tickets Table
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE NOT NULL,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  predicted_category text,
  predicted_confidence numeric,
  category_overridden boolean DEFAULT false,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status ticket_status NOT NULL DEFAULT 'OPEN',
  priority priority_level NOT NULL DEFAULT 'MEDIUM',
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Other tables
CREATE TABLE public.ticket_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tickets_student ON public.tickets (student_id);
CREATE INDEX idx_tickets_department ON public.tickets (department_id);
CREATE INDEX idx_tickets_status ON public.tickets (status);
CREATE INDEX idx_comments_ticket ON public.ticket_comments (ticket_id);
CREATE INDEX idx_assignments_ticket ON public.ticket_assignments (ticket_id);

-- Foreign keys
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_department 
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
```

---

## Migration 2: RLS Policies

See SETUP.md for complete RLS documentation. Enable RLS and create policies for all tables.

---

## Migration 3: Seed Departments

```sql
INSERT INTO public.departments (name, code) VALUES
  ('Academics / Program Office', 'ACAD_OFFICE'),
  ('Examination Cell', 'EXAMS'),
  ('Accounts / Fees Department', 'FEES'),
  ('IT Support / LMS', 'IT_SUPPORT'),
  ('Library', 'LIB'),
  ('Hostel Office', 'HOSTEL'),
  ('Infrastructure & Maintenance', 'INFRA'),
  ('Placement Cell', 'PLACEMENT')
  -- Add all 32 departments from SETUP.md
ON CONFLICT (code) DO NOTHING;
```

---

## Migration 4: Storage

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false);
-- Add storage RLS policies as documented
```
