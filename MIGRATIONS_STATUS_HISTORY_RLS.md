# Status History RLS Policies Migration

Run this SQL in your Supabase SQL editor to enable students to view ticket status history:

```sql
-- Enable RLS on status_history table
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read status history for tickets they can access
CREATE POLICY "Users can view status history for their tickets"
ON status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = status_history.ticket_id
    AND tickets.student_id = auth.uid()
  )
);

-- Allow authenticated users to insert status history
CREATE POLICY "Authenticated users can create status history"
ON status_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update status history they created or for their tickets
CREATE POLICY "Users can update status history for their tickets"
ON status_history
FOR UPDATE
TO authenticated
USING (
  changed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = status_history.ticket_id
    AND tickets.student_id = auth.uid()
  )
);
```

After running this migration:
- Students can view all status history for their own tickets
- Any authenticated user can create status history entries
- Users can update status history they created or for tickets they own
