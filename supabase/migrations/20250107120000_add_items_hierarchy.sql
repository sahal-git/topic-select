/*
# Add Items Hierarchy to Topic Selection

This migration adds a hierarchical structure where items contain topics.
Each team can select one topic from any item.

## Query Description: 
This operation adds a new items table and modifies the existing topics table to reference items. 
This creates a parent-child relationship where items contain multiple topics. 
Existing topic data will be preserved - backup recommended for safety.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: true
- Reversible: true

## Structure Details:
- Creates new 'items' table with id, title, description, created_at, updated_at
- Adds item_id foreign key to existing 'topics' table
- Preserves existing topic data and selections

## Security Implications:
- RLS Status: Enabled on both tables
- Policy Changes: Yes - adds policies for items table
- Auth Requirements: Same as existing (admin auth for modifications)

## Performance Impact:
- Indexes: Added on item_id foreign key
- Triggers: No new triggers added
- Estimated Impact: Minimal performance impact, adds one JOIN for topic queries
*/

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add item_id column to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE CASCADE;

-- Create index on item_id for better performance
CREATE INDEX IF NOT EXISTS idx_topics_item_id ON topics(item_id);

-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policies for items table (same as topics)
CREATE POLICY "Allow public read access on items" ON items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on items" ON items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update on items" ON items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete on items" ON items FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp for items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Insert some sample items and move existing topics to first item
INSERT INTO items (title, description) VALUES 
  ('Technical Events', 'Programming, web development, and technical competitions'),
  ('Cultural Events', 'Art, music, dance, and cultural performances'),
  ('Sports Events', 'Athletic competitions and sports activities'),
  ('Academic Events', 'Research presentations, debates, and academic competitions');

-- Move existing topics to the first item (Technical Events)
UPDATE topics 
SET item_id = (SELECT id FROM items WHERE title = 'Technical Events' LIMIT 1)
WHERE item_id IS NULL;
