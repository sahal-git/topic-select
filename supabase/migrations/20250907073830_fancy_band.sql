/*
  # Add app live setting

  1. New Settings
    - Add 'app_live' setting to control whether the app is live or not
    - Default value is 'false' (not live)

  2. Security
    - Uses existing RLS policies for app_settings table
*/

INSERT INTO app_settings (key, value) 
VALUES ('app_live', 'false')
ON CONFLICT (key) DO NOTHING;
