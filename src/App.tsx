import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import TeamSelection from './components/TeamSelection';
import TeamLogin from './components/TeamLogin';
import TeamContent from './components/TeamContent';
import { Team } from './lib/supabase';

type View = 'home' | 'admin' | Team | `${Team}-content`;

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [authenticatedTeams, setAuthenticatedTeams] = useState<Set<Team>>(new Set());
  const [session, setSession] = useState<Session | null>(null);
  const [isAppLive, setIsAppLive] = useState(false);

  const checkAppStatus = async () => {
    try {
      const { data: manualOverrideSetting, error: manualOverrideError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_live')
        .single();
      
      if (manualOverrideError) throw manualOverrideError;

      const isManualOverrideLive = manualOverrideSetting?.value === 'true';

      if (!isManualOverrideLive) {
        setIsAppLive(false);
        return;
      }

      const { data: schedule, error: scheduleError } = await supabase
        .from('app_schedule')
        .select('live_from, offline_at')
        .eq('id', 1)
        .single();
      
      if (scheduleError) throw scheduleError;

      const now = new Date();
      const liveFrom = schedule?.live_from ? new Date(schedule.live_from) : null;
      const offlineAt = schedule?.offline_at ? new Date(schedule.offline_at) : null;

      let isScheduledLive = false;
      if (liveFrom && offlineAt) {
        isScheduledLive = now >= liveFrom && now < offlineAt;
      } else if (liveFrom) {
        isScheduledLive = now >= liveFrom;
      } else if (offlineAt) {
        isScheduledLive = now < offlineAt;
      } else {
        isScheduledLive = true; // No schedule means it's always within the scheduled time
      }

      setIsAppLive(isManualOverrideLive && isScheduledLive);

    } catch (error) {
      console.error('Error checking app status:', error);
      setIsAppLive(false);
    }
  };

  useEffect(() => {
    checkAppStatus(); // Initial check

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Listen for status changes
    const statusChannel = supabase
      .channel('app-status-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_live' }, checkAppStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_schedule', filter: 'id=eq.1' }, checkAppStatus)
      .subscribe();
      
    // Re-check status every 30 seconds as a fallback
    const intervalId = setInterval(checkAppStatus, 30000);

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(statusChannel);
      clearInterval(intervalId);
    };
  }, []);

  const handleTeamLogin = (team: Team) => {
    setAuthenticatedTeams(prev => new Set([...prev, team]));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomePage onViewChange={setCurrentView} isAppLive={isAppLive} />;
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
          return <TeamSelection team={currentView} onViewChange={setCurrentView} isAppLive={isAppLive} />;
        } else {
          return <TeamLogin team={currentView} onLoginSuccess={() => handleTeamLogin(currentView)} isAppLive={isAppLive} />;
        }
      case 'Almaria-content':
      case 'Tolido-content':
      case 'Zaragoza-content':
        const team = currentView.replace('-content', '') as Team;
        if (authenticatedTeams.has(team)) {
          return <TeamContent team={team} onViewChange={setCurrentView} isAppLive={isAppLive} />;
        } else {
          return <TeamLogin team={team} onLoginSuccess={() => handleTeamLogin(team)} isAppLive={isAppLive} />;
        }
      default:
        return <HomePage onViewChange={setCurrentView} isAppLive={isAppLive} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} onViewChange={setCurrentView} isAppLive={isAppLive} />
      {renderContent()}
    </div>
  );
}

export default App;
