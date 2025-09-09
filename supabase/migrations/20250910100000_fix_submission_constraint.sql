/*
# [Fix Content Submission Constraint]
This migration corrects the unique constraint on the `team_content_submissions` table to allow teams to submit up to two entries per content item, as intended by the application's user interface.

## Query Description:
This operation modifies a database constraint. It first drops an existing unique constraint that incorrectly limited teams to one submission per content item. It then adds a new, more appropriate unique constraint on the combination of the content item, team, and submission name. This change aligns the database schema with the application's functionality.

- **Impact on existing data:** This change is non-destructive to existing data. It only alters the rules for future data insertion.
- **Safety:** This is a safe structural change. No data will be lost.
- **Recommendation:** It is safe to apply this migration.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- **Table:** `public.team_content_submissions`
- **Constraint Dropped:** `team_content_submissions_content_item_id_team_name_key`
- **Constraint Added:** `team_content_submissions_item_team_name_content_unique` on columns `(content_item_id, team_name, content_name)`

## Security Implications:
- RLS Status: Unchanged
- Policy Changes: No
- Auth Requirements: None

## Performance Impact:
- Indexes: Modifies a unique index. The performance impact is negligible and positive, as it enables the correct application behavior.
- Triggers: None
- Estimated Impact: Low
*/

-- Step 1: Drop the incorrect unique constraint that prevents multiple submissions per team.
-- This constraint was on (content_item_id, team_name).
ALTER TABLE public.team_content_submissions
DROP CONSTRAINT IF EXISTS team_content_submissions_content_item_id_team_name_key;

-- Step 2: Add a new, more flexible unique constraint.
-- This allows a team to have multiple submissions for the same content item,
-- as long as the `content_name` for each submission is unique.
-- This prevents duplicate entries while still allowing the two intended submissions.
ALTER TABLE public.team_content_submissions
ADD CONSTRAINT team_content_submissions_item_team_name_content_unique
UNIQUE (content_item_id, team_name, content_name);
