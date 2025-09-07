import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Topic = {
  id: string;
  title: string;
  selected_by_team: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamCredentials = {
  id: string;
  team_name: string;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
};

export const TEAMS = ['Almaria', 'Tolido', 'Zaragoza'] as const;
export type Team = typeof TEAMS[number];