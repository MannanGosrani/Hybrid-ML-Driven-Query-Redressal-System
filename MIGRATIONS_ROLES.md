# Migration: Department-Specific Role System

This migration creates a secure role system where roles are stored in a separate table, preventing privilege escalation attacks.

## Migration: User Roles Table

Run this in your Supabase SQL Editor:

```sql
-- Create enum for base roles
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'dept_admin', 'main_admin');

-- Create user_roles table with department association
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role, department_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role for a department
CREATE OR REPLACE FUNCTION public.has_role_for_department(_user_id uuid, _role app_role, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (department_id = _department_id OR department_id IS NULL)
  )
$$;

-- Security definer function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's department for their dept_admin role
CREATE OR REPLACE FUNCTION public.get_user_dept_admin_department(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'dept_admin'
  LIMIT 1
$$;

-- RLS Policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only main admins can insert/update/delete roles
CREATE POLICY "Main admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'main_admin'))
WITH CHECK (public.has_role(auth.uid(), 'main_admin'));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, department_id)
SELECT id, role, department_id
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role, department_id) DO NOTHING;

-- Create index for performance
CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles (role);
CREATE INDEX idx_user_roles_department ON public.user_roles (department_id);
```

## Update RLS Policies for Tickets

Update the tickets table RLS policies to use the new role system:

```sql
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Students can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Dept admins can view department tickets" ON public.tickets;
DROP POLICY IF EXISTS "Main admins can view all tickets" ON public.tickets;

-- Students can view their own tickets
CREATE POLICY "Students can view own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() 
  OR public.has_role(auth.uid(), 'main_admin')
  OR public.has_role_for_department(auth.uid(), 'dept_admin', department_id)
  OR public.has_role_for_department(auth.uid(), 'teacher', department_id)
);

-- Students can create tickets
CREATE POLICY "Students can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.has_role(auth.uid(), 'student')
);

-- Dept admins can update their department's tickets
CREATE POLICY "Dept admins can update department tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'main_admin')
  OR public.has_role_for_department(auth.uid(), 'dept_admin', department_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'main_admin')
  OR public.has_role_for_department(auth.uid(), 'dept_admin', department_id)
);
```

## Notes

- The `profiles.role` and `profiles.department_id` columns are kept for backwards compatibility but should not be used for authorization
- All role checks should use the `has_role()` and `has_role_for_department()` functions
- Department admins are tied to specific departments via the `user_roles.department_id` column
- Main admins have NULL `department_id` and can access all departments
