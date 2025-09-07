/*
  # [Structural] Create Content Selection Tables
  This migration sets up the database schema required for the admin-managed content items and team-based content submissions.

  ## Query Description: 
  This script creates two new tables: `content_items` and `team_content_submissions`. It also defines a function and triggers to automatically update the `updated_at` timestamp on row changes. No existing data will be affected as these are new tables.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the created tables and function)
  
  ## Structure Details:
  - Creates function `moddatetime` to handle `updated_at` timestamps.
  - Creates table `public.content_items` for admins to define content categories.
  - Creates table `public.team_content_submissions` for teams to submit their content.
  - Adds foreign key constraints and a unique constraint to maintain data integrity.
  
  ## Security Implications:
  - RLS Status: **Disabled**. Row Level Security is NOT enabled in this migration.
  - Policy Changes: No
  - Auth Requirements: None for this migration.
  - **IMPORTANT**: A follow-up task is required to implement proper team-based authentication and enable RLS on these tables to secure submissions.

  ## Performance Impact:
  - Indexes: Primary keys are indexed by default.
  - Triggers: Adds `updated_at` triggers to both new tables.
  - Estimated Impact: Negligible performance impact.
*/

-- Create a function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create the content_items table for admins to manage
CREATE TABLE public.content_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    description text NULL,
    allow_links boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT content_items_pkey PRIMARY KEY (id)
);

-- 2. Create the team_content_submissions table for teams to submit content
CREATE TABLE public.team_content_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    content_item_id uuid NOT NULL,
    team_name text NOT NULL CHECK (team_name IN ('Almaria', 'Tolido', 'Zaragoza')),
    content_name text NOT NULL,
    content_description text NULL,
    content_link text NULL,
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT team_content_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT team_content_submissions_content_item_id_fkey FOREIGN KEY (content_item_id) REFERENCES public.content_items(id) ON DELETE CASCADE,
    CONSTRAINT team_content_submissions_item_team_unique UNIQUE (content_item_id, team_name)
);

-- 3. Add triggers to automatically update the 'updated_at' column
CREATE TRIGGER handle_updated_at_content_items
BEFORE UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER handle_updated_at_team_submissions
BEFORE UPDATE ON public.team_content_submissions
FOR EACH ROW
EXECUTE FUNCTION public.moddatetime();
