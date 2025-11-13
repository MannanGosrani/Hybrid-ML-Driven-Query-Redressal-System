# Simplified Ticket Status Migration

This migration simplifies the ticket status workflow to only 3 statuses: **Open**, **Under Review**, and **Closed**.

## Run this SQL in your Supabase SQL editor:

```sql
-- Step 1: Update existing tickets to new status values
UPDATE tickets 
SET status = CASE
  WHEN status IN ('OPEN', 'REOPENED') THEN 'OPEN'
  WHEN status IN ('IN_REVIEW', 'IN_PROGRESS', 'AWAITING_STUDENT') THEN 'UNDER_REVIEW'
  WHEN status IN ('RESOLVED', 'CLOSED') THEN 'CLOSED'
  ELSE 'OPEN'
END;

-- Step 2: Update status_history to new status values
UPDATE status_history
SET to_status = CASE
  WHEN to_status IN ('OPEN', 'REOPENED') THEN 'OPEN'
  WHEN to_status IN ('IN_REVIEW', 'IN_PROGRESS', 'AWAITING_STUDENT') THEN 'UNDER_REVIEW'
  WHEN to_status IN ('RESOLVED', 'CLOSED') THEN 'CLOSED'
  ELSE 'OPEN'
END;

UPDATE status_history
SET from_status = CASE
  WHEN from_status IN ('OPEN', 'REOPENED') THEN 'OPEN'
  WHEN from_status IN ('IN_REVIEW', 'IN_PROGRESS', 'AWAITING_STUDENT') THEN 'UNDER_REVIEW'
  WHEN from_status IN ('RESOLVED', 'CLOSED') THEN 'CLOSED'
  ELSE NULL
END
WHERE from_status IS NOT NULL;

-- Step 3: Drop old enum type and create new one
ALTER TABLE tickets ALTER COLUMN status TYPE text;
ALTER TABLE status_history ALTER COLUMN to_status TYPE text;
ALTER TABLE status_history ALTER COLUMN from_status TYPE text;

DROP TYPE IF EXISTS ticket_status CASCADE;

CREATE TYPE ticket_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'CLOSED');

ALTER TABLE tickets 
  ALTER COLUMN status TYPE ticket_status USING status::ticket_status;

ALTER TABLE status_history 
  ALTER COLUMN to_status TYPE ticket_status USING to_status::ticket_status;

ALTER TABLE status_history 
  ALTER COLUMN from_status TYPE ticket_status USING from_status::ticket_status;
```

## New Status Workflow

1. **OPEN** - Initial state when ticket is created
2. **UNDER_REVIEW** - Ticket is being reviewed/worked on by department
3. **CLOSED** - Ticket has been resolved and closed

This simplified workflow makes it easier for students to track their tickets and for admins to manage them.
