import React from 'react';
import { useState, useEffect } from 'react';
import { Users, Settings, Trophy, Shield } from 'lucide-react';
import { TEAMS, Team, supabase } from '../lib/supabase';

type View = 'home' | 'admin' | Team;

interface HomePageProps {
  onViewChange: (view: View) => void;
}

export default function HomePage({ onViewChange }: HomePageProps) {
  const [isAppLive, setIsAppLive] = useState(false);

  useEffect(() => {
    fetchAppLiveStatus();

    const refreshInterval = setInterval(() => {
      fetchAppLiveStatus();
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchAppLiveStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'app_live')
        .single();

      if (error) throw error;
      setIsAppLive(data?.value === 'true');
    } catch (error) {
      console.error('Error fetching app live status:', error);
    }
  };

  const getTeamColor = (team: Team) => {
    switch (team) {
      case 'Almaria': return 'bg-blue-500 hover:bg-blue-600 border-blue-200';
      case 'Tolido': return 'bg-green-500 hover:bg-green-600 border-green-200';
      case 'Zaragoza': return 'bg-purple-500 hover:bg-purple-600 border-purple-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="bg-primary-500 p-4 rounded-2xl">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              KHANDAQ '25
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Welcome to the fest topic selection portal. Choose your team below to get started.
          </p>
          
          {/* Status Indicator */}
          <div className="mb-12">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border-2 ${
              isAppLive 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                isAppLive ? 'bg-green-500 animate-pulse' : 'bg-orange-500 animate-pulse'
              }`}></div>
              <span className="font-semibold">
                {isAppLive ? 'Topic Selection is LIVE' : 'Waiting for Controller Permission'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Selection Cards */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {isAppLive ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Select Your Team</h2>
              <p className="text-gray-600">Click on your team to access the topic selection dashboard</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TEAMS.map((team) => (
                <button
                  key={team}
                  onClick={() => onViewChange(team)}
                  className={`${getTeamColor(team)} text-white p-8 rounded-2xl transition-all hover:scale-105 hover:shadow-lg group border-2`}
                >
                  <div className="text-center">
                    <div className="bg-white bg-opacity-20 p-4 rounded-xl mb-4 mx-auto w-fit">
                      <Users className="h-12 w-12" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Team {team}</h3>
                    <p className="text-white text-opacity-90 mb-4">
                      Access your team's topic selection dashboard
                    </p>
                    <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg inline-block group-hover:bg-opacity-30 transition-all">
                      <span className="font-semibold">Enter Dashboard →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Waiting State */
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-4 text-orange-600 mb-8">
              <div className="bg-orange-100 p-6 rounded-2xl">
                <Shield className="h-16 w-16" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Topic Selection Currently Offline</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The event controller has not yet opened the topic selection system. 
              Please wait for further instructions.
            </p>
            
            {/* Disabled Team Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50">
              {TEAMS.map((team) => (
                <div
                  key={team}
                  className="bg-gray-300 text-gray-500 p-8 rounded-2xl border-2 border-gray-200 cursor-not-allowed"
                >
                  <div className="text-center">
                    <div className="bg-gray-400 bg-opacity-20 p-4 rounded-xl mb-4 mx-auto w-fit">
                      <Users className="h-12 w-12" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Team {team}</h3>
                    <p className="mb-4">
                      Waiting for access...
                    </p>
                    <div className="bg-gray-400 bg-opacity-20 px-4 py-2 rounded-lg inline-block">
                      <span className="font-semibold">Locked</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Access - Subtle */}
        <div className="mt-16 text-center">
          <button
            onClick={() => onViewChange('admin')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <Settings className="h-4 w-4" />
            Admin Access
          </button>
        </div>
      </div>
    </div>
  );
}
