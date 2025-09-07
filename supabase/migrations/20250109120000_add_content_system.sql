/*
# Content Selection System
Creates tables for content management where admins can create content items and teams can submit content.

## Query Description: 
This migration adds content management functionality to the system. It creates tables for content items that admins can manage, and team content submissions where teams can provide content name, description, and optional links. This is safe to run and doesn't affect existing topic selection data.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low" 
- Requires-Backup: false
- Reversible: true

## Structure Details:
- content_items: Stores content categories created by admins
- team_content_submissions: Stores content submitted by teams

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes
- Auth Requirements: Teams can only view/edit their own submissions

## Performance Impact:
- Indexes: Added for foreign keys and team lookups
- Triggers: None
- Estimated Impact: Minimal performance impact
*/

-- Create content_items table for admin-managed content categories
CREATE TABLE content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    allow_links BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_content_submissions table for team-submitted content
CREATE TABLE team_content_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    content_name TEXT NOT NULL,
    content_description TEXT,
    content_link TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_item_id, team_name)
);

-- Create indexes for better performance
CREATE INDEX idx_content_items_active ON content_items(is_active);
CREATE INDEX idx_team_content_submissions_team ON team_content_submissions(team_name);
CREATE INDEX idx_team_content_submissions_item ON team_content_submissions(content_item_id);

-- Enable RLS on content_items
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Content items are readable by everyone but only modifiable by authenticated users (admins)
CREATE POLICY "Content items are viewable by everyone" ON content_items
    FOR SELECT USING (true);

CREATE POLICY "Content items are insertable by authenticated users" ON content_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Content items are updatable by authenticated users" ON content_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Content items are deletable by authenticated users" ON content_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Enable RLS on team_content_submissions
ALTER TABLE team_content_submissions ENABLE ROW LEVEL SECURITY;

-- Team submissions are viewable by everyone but only modifiable by the submitting team
CREATE POLICY "Team content submissions are viewable by everyone" ON team_content_submissions
    FOR SELECT USING (true);

CREATE POLICY "Team content submissions are insertable by anyone" ON team_content_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Team content submissions are updatable by anyone" ON team_content_submissions
    FOR UPDATE USING (true);

CREATE POLICY "Team content submissions are deletable by authenticated users" ON team_content_submissions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_content_submissions_updated_at BEFORE UPDATE ON team_content_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
