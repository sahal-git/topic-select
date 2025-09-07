import React, { useState } from 'react';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import TeamSelection from './components/TeamSelection';
import TeamLogin from './components/TeamLogin';
import { Team } from './lib/supabase';

type View = 'home' | 'admin' | Team;

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [authenticatedTeams, setAuthenticatedTeams] = useState<Set<Team>>(new Set());
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTeamLogin = (team: Team) => {
    setAuthenticatedTeams(prev => new Set([...prev, team]));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomePage onViewChange={setCurrentView} />;
      case 'admin':
        if (session) {
          return <AdminPanel />;
        } else {
          return <AdminLogin />;
        }
      case 'Almaria':
      case 'Tolido':
      case 'Zaragoza':
        if (authenticatedTeams.has(currentView)) {
          return <TeamSelection team={currentView} />;
        } else {
          return <TeamLogin team={currentView} onLoginSuccess={() => handleTeamLogin(currentView)} />;
        }
      default:
        return <HomePage onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      {renderContent()}
    </div>
  );
}

export default App;