/*
          # [Feature] Add Submission-type Items
          This migration introduces the functionality for a new type of item where teams can submit text-based entries (e.g., a project name and description) instead of selecting from a predefined list.

          ## Query Description: This operation is structural and adds new capabilities without altering existing topic selection data.
          1.  It modifies the `items` table to include an `item_type` column, allowing you to distinguish between 'mcq' (the current topic selection) and 'submission' (the new text entry type).
          2.  It creates a new `team_submissions` table to store the entries submitted by each team for the new item type.
          3.  It sets up security policies on the new table to ensure data is handled safely.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true

          ## Structure Details:
          - **Table Modified:** `public.items`
            - Added column: `item_type` (TEXT, defaults to 'mcq')
          - **Table Created:** `public.team_submissions`
            - Columns: `id`, `item_id`, `team_name`, `submission_title`, `submission_description`, `submitted_at`, `created_at`, `updated_at`
            - Constraints: Foreign key to `items`, Unique constraint on `(item_id, team_name)`

          ## Security Implications:
          - RLS Status: Enabled on `team_submissions`
          - Policy Changes: Yes, new policies created for `team_submissions`.
            - Admins (authenticated role) get full access.
            - All users (including teams using the anon key) can read from the table and insert new submissions. Updates and deletes are restricted to admins. This relies on client-side logic to filter data correctly for teams.
          - Auth Requirements: Admin role for management.

          ## Performance Impact:
          - Indexes: A primary key and a unique constraint index will be created on the new table.
          - Triggers: None added.
          - Estimated Impact: Negligible performance impact.
          */

-- Step 1: Add a type discriminator to the items table.
-- This allows us to differentiate between "multiple choice" items and "submission" items.
ALTER TABLE public.items
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'mcq';

-- Add a check constraint to ensure data integrity for the new column.
ALTER TABLE public.items
ADD CONSTRAINT items_item_type_check CHECK (item_type IN ('mcq', 'submission'));

COMMENT ON COLUMN public.items.item_type IS 'The type of item, determining how teams interact with it. ''mcq'' for topic selection, ''submission'' for text entry.';

-- Step 2: Create a new table to store team submissions for the new item type.
CREATE TABLE public.team_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    submission_title TEXT NOT NULL,
    submission_description TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- A team can only submit once per item.
    CONSTRAINT team_submission_per_item UNIQUE (item_id, team_name)
);

COMMENT ON TABLE public.team_submissions IS 'Stores submissions from teams for items of type "submission".';
COMMENT ON COLUMN public.team_submissions.submitted_at IS 'The timestamp when the submission was made by the team.';
COMMENT ON CONSTRAINT team_submission_per_item ON public.team_submissions IS 'Ensures each team can only have one submission per submission-type item.';

-- Step 3: Enable Row Level Security and define access policies for the new table.
ALTER TABLE public.team_submissions ENABLE ROW LEVEL SECURITY;

-- Policy for Admins: Admins have unrestricted access to all submissions.
CREATE POLICY "Allow admin full access"
ON public.team_submissions
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Policy for Teams (anon role): Allow teams to view all submissions.
-- The application's client-side logic is responsible for filtering to show only relevant data.
CREATE POLICY "Allow read access for all"
ON public.team_submissions
FOR SELECT
USING (true);

-- Policy for Teams (anon role): Allow teams to create new submissions.
-- The UNIQUE constraint prevents a team from overwriting another's submission by re-inserting.
CREATE POLICY "Allow insert for all"
ON public.team_submissions
FOR INSERT
WITH CHECK (true);
