/*
  # Add team credentials functionality

  1. New Tables
    - `team_credentials`
      - `id` (uuid, primary key)
      - `team_name` (text, unique)
      - `username` (text)
      - `password` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `team_credentials` table
    - Add policy for public access (since we're not using Supabase auth)

  3. Initial Data
    - Create default credentials for all teams
*/

CREATE TABLE IF NOT EXISTS team_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text UNIQUE NOT NULL,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read team credentials"
  ON team_credentials
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update team credentials"
  ON team_credentials
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can insert team credentials"
  ON team_credentials
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_team_credentials_updated_at
  BEFORE UPDATE ON team_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default credentials for all teams
INSERT INTO team_credentials (team_name, username, password) VALUES
  ('Almaria', '', ''),
  ('Tolido', '', ''),
  ('Zaragoza', '', '')
ON CONFLICT (team_name) DO NOTHING;