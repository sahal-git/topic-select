import React, { useState, useEffect } from 'react';
import { supabase, TeamCredentials, Team, AppSettings } from '../lib/supabase';
import { Users, Lock, Eye, EyeOff, Trophy, Shield } from 'lucide-react';

interface TeamLoginProps {
  team: Team;
  onLoginSuccess: () => void;
}

export default function TeamLogin({ team, onLoginSuccess }: TeamLoginProps) {
  const [credentials, setCredentials] = useState<TeamCredentials | null>(null);
  const [isAppLive, setIsAppLive] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTeamCredentials();
    fetchAppLiveStatus();

    const refreshInterval = setInterval(() => {
      fetchAppLiveStatus();
    }, 1000);

    return () => clearInterval(refreshInterval);
  }, [team]);

  const fetchTeamCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('team_credentials')
        .select('*')
        .eq('team_name', team)
        .single();

      if (error) throw error;
      setCredentials(data);
    } catch (error) {
      console.error('Error fetching team credentials:', error);
    }
  };

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!credentials) {
        throw new Error('Team credentials not found');
      }

      if (!credentials.username && !credentials.password) {
        onLoginSuccess();
        return;
      }

      if (username === credentials.username && password === credentials.password) {
        onLoginSuccess();
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamConfig = (team: Team) => {
    switch (team) {
      case 'Almaria':
        return {
          bgColor: 'bg-blue-500',
          hoverColor: 'hover:bg-blue-600'
        };
      case 'Tolido':
        return {
          bgColor: 'bg-green-500',
          hoverColor: 'hover:bg-green-600'
        };
      case 'Zaragoza':
        return {
          bgColor: 'bg-purple-500',
          hoverColor: 'hover:bg-purple-600'
        };
    }
  };

  const config = getTeamConfig(team);

  if (credentials && !credentials.username && !credentials.password) {
    onLoginSuccess();
    return null;
  }

  // Show waiting message if app is not live
  if (!isAppLive) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className={`${config.bgColor} px-6 py-8 text-center`}>
              <div className="inline-flex items-center gap-3 text-white mb-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <Trophy className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold">Team {team}</h1>
              </div>
            </div>

            {/* Waiting Message */}
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3 text-orange-600 mb-6">
                <div className="bg-orange-100 p-4 rounded-full">
                  <Shield className="h-12 w-12" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Waiting for Controller's Permission</h2>
              <p className="text-gray-600 mb-6">
                The topic selection system is currently offline. Please wait for the event controller to make the system live.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>System Offline</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Compact Header */}
          <div className={`${config.bgColor} px-6 py-8 text-center`}>
            <div className="inline-flex items-center gap-3 text-white mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Trophy className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">Team {team}</h1>
            </div>
            <p className="text-white text-opacity-90">
              Enter credentials to access topic selection
            </p>
          </div>

          {/* Login Form */}
          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${config.bgColor} ${config.hoverColor} text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
              >
                {isLoading ? 'Logging in...' : 'Access Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}