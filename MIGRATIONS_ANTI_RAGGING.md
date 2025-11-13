# Anti-Ragging Department Migration

Run this SQL in your Supabase SQL Editor to add the Anti-Ragging / Discipline Committee department:

```sql
-- Add Anti-Ragging / Discipline Committee department
INSERT INTO departments (name, code)
VALUES (
  'Anti-Ragging / Discipline Committee',
  'ANTI_RAGGING'
)
ON CONFLICT (code) DO NOTHING;
```

After running this, you can assign a department admin to this department using:

```sql
-- Get the department ID
SELECT id, name FROM departments WHERE code = 'ANTI_RAGGING';

-- Get the admin user ID (replace with actual email)
SELECT id, email FROM profiles WHERE email = 'antiragging@nmims.in';

-- Assign the admin role (replace the IDs)
INSERT INTO user_roles (user_id, role, department_id)
VALUES 
  ('user-id-here', 'dept_admin', 'anti-ragging-dept-id-here');
```
