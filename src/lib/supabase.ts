import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Item = {
  id: string;
  title: string;
  description: string | null;
  // The 'type' column still exists in the DB but is not used by the app now.
  type: 'mcq' | 'submission'; 
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  title: string;
  item_id: string;
  selected_by_team: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemWithData = Item & {
  topics: Topic[];
};

export type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  allow_links: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamContentSubmission = {
  id: string;
  content_item_id: string;
  team_name: string;
  content_name: string;
  content_description: string | null;
  content_link: string | null;
  submitted_at: string;
  updated_at: string;
};

export type ContentItemWithSubmissions = ContentItem & {
  submissions: TeamContentSubmission[];
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
