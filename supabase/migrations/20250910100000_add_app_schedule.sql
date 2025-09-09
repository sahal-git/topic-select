/*
# [Operation Name]
Create App Schedule Table

[Description of what this operation does]
This migration creates a new table `app_schedule` to manage the automatic live/offline status of the application based on a schedule. It also includes a boolean flag to enable or disable the scheduling feature.

## Query Description: [This operation adds a new table for scheduling and does not affect any existing data. It's a safe, structural change.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Creates table `public.app_schedule`
  - `id` (int8, primary key)
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `is_enabled` (bool)
  - `created_at` (timestamptz)

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Admin users can update, all users can read.]

## Performance Impact:
- Indexes: [Primary Key on id]
- Triggers: [None]
- Estimated Impact: [Low. The table will contain only one row.]
*/

-- 1. Create the app_schedule table
CREATE TABLE public.app_schedule (
    id BIGINT PRIMARY KEY DEFAULT 1,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- 2. Insert the single default row
INSERT INTO public.app_schedule (id, start_time, end_time, is_enabled)
VALUES (1, NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE public.app_schedule ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Allow public read access to everyone
CREATE POLICY "Allow public read access to schedule"
ON public.app_schedule
FOR SELECT
USING (true);

-- Allow admin users (authenticated role) to update the schedule
CREATE POLICY "Allow admin to update schedule"
ON public.app_schedule
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Comment on the table
COMMENT ON TABLE public.app_schedule IS 'Stores the application live/offline schedule.';
