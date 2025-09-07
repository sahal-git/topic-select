/*
  # Create topics table for fest topic selection

  1. New Tables
    - `topics`
      - `id` (uuid, primary key)
      - `title` (text, not null) - The topic title
      - `selected_by_team` (text, nullable) - Which team selected this topic
      - `created_at` (timestamp with timezone, default now())
      - `updated_at` (timestamp with timezone, default now())

  2. Security
    - Enable RLS on `topics` table
    - Add policies for public access since no authentication is required
*/

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  selected_by_team text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Allow public access for reading topics
CREATE POLICY "Anyone can read topics"
  ON topics
  FOR SELECT
  TO public
  USING (true);

-- Allow public access for inserting topics (admin functionality)
CREATE POLICY "Anyone can insert topics"
  ON topics
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public access for updating topics (team selection)
CREATE POLICY "Anyone can update topics"
  ON topics
  FOR UPDATE
  TO public
  USING (true);

-- Allow public access for deleting topics (admin functionality)
CREATE POLICY "Anyone can delete topics"
  ON topics
  FOR DELETE
  TO public
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
