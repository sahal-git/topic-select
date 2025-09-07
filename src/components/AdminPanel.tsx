import React, { useState, useEffect } from 'react';
import { supabase, Topic, TeamCredentials, AppSettings, TEAMS } from '../lib/supabase';
import { Plus, Trash2, RefreshCw, Users, CheckCircle, Circle, Key, Save, Shield, Edit, Trophy, BarChart3, LogOut, Eye, EyeOff, Power, PowerOff } from 'lucide-react';

interface AdminPanelProps {}

export default function AdminPanel({}: AdminPanelProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [teamCredentials, setTeamCredentials] = useState<TeamCredentials[]>([]);
  const [isAppLive, setIsAppLive] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingLiveStatus, setIsUpdatingLiveStatus] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState<{[key: string]: {username: string, password: string}}>({});
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'credentials'>('overview');

  useEffect(() => {
    fetchTopics();
    fetchTeamCredentials();
    fetchAppLiveStatus();

    const refreshInterval = setInterval(() => {
      fetchTopics();
      fetchTeamCredentials();
      fetchAppLiveStatus();
    }, 1000);
    
    const channel = supabase
      .channel('topics-admin')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'topics' },
        (payload) => {
          setTopics(prev => [...prev, payload.new as Topic]);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'topics' },
        (payload) => {
          setTopics(prev => prev.map(topic => 
            topic.id === payload.new.id ? payload.new as Topic : topic
          ));
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'topics' },
        (payload) => {
          setTopics(prev => prev.filter(topic => topic.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const fetchTeamCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('team_credentials')
        .select('*')
        .order('team_name', { ascending: true });

      if (error) throw error;
      setTeamCredentials(data || []);
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

  const toggleAppLiveStatus = async () => {
    setIsUpdatingLiveStatus(true);
    try {
      const newStatus = !isAppLive;
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newStatus.toString() })
        .eq('key', 'app_live');

      if (error) throw error;
      setIsAppLive(newStatus);
    } catch (error) {
      console.error('Error updating app live status:', error);
    } finally {
      setIsUpdatingLiveStatus(false);
    }
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('topics')
        .insert([{ title: newTopic.trim() }]);

      if (error) throw error;
      setNewTopic('');
    } catch (error) {
      console.error('Error adding topic:', error);
      fetchTopics();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTopic = async (id: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting topic:', error);
      fetchTopics();
    }
  };

  const resetSelection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .update({ selected_by_team: null })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting selection:', error);
      fetchTopics();
    }
  };

  const resetAllSelections = async () => {
    try {
      const { error } = await supabase
        .from('topics')
        .update({ selected_by_team: null })
        .neq('selected_by_team', null);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting all selections:', error);
      fetchTopics();
    }
  };

  const updateTeamCredentials = async (teamName: string, username: string, password: string) => {
    try {
      const { error } = await supabase
        .from('team_credentials')
        .update({ username, password })
        .eq('team_name', teamName);

      if (error) throw error;
      
      setEditingCredentials(prev => {
        const newState = { ...prev };
        delete newState[teamName];
        return newState;
      });
      
      fetchTeamCredentials();
    } catch (error) {
      console.error('Error updating team credentials:', error);
    }
  };

  const startEditingCredentials = (teamName: string, currentUsername: string, currentPassword: string) => {
    setEditingCredentials(prev => ({
      ...prev,
      [teamName]: { username: currentUsername, password: currentPassword }
    }));
  };

  const cancelEditingCredentials = (teamName: string) => {
    setEditingCredentials(prev => {
      const newState = { ...prev };
      delete newState[teamName];
      return newState;
    });
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'Almaria': return 'text-blue-600 bg-blue-50';
      case 'Tolido': return 'text-green-600 bg-green-50';
      case 'Zaragoza': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const availableTopics = topics.filter(topic => !topic.selected_by_team);
  const selectedTopics = topics.filter(topic => topic.selected_by_team);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

          {/* Mobile-friendly tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'topics', label: 'Topics', icon: Trophy },
              { id: 'credentials', label: 'Teams', icon: Key }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Compact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${isAppLive ? 'text-green-600' : 'text-red-600'}`}>
                  {isAppLive ? 'LIVE' : 'OFF'}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">App Status</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{topics.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Total Topics</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{selectedTopics.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Selected</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">{availableTopics.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Available</div>
              </div>
            </div>

            {/* App Control & Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">App Control & Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={toggleAppLiveStatus}
                  disabled={isUpdatingLiveStatus}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isAppLive 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isAppLive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  {isUpdatingLiveStatus ? 'Updating...' : (isAppLive ? 'Make App Offline' : 'Make App Live')}
                </button>
                <button
                  onClick={resetAllSelections}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset All
                </button>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isAppLive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium text-gray-700">
                    App Status: {isAppLive ? 'Live - Teams can access topic selection' : 'Offline - Teams will see waiting message'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Recent Selections</h3>
              </div>
              <div className="p-4">
                {selectedTopics.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No selections yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTopics.slice(0, 5).map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{topic.title}</div>
                          <div className="text-xs text-gray-500">Selected by Team {topic.selected_by_team}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getTeamColor(topic.selected_by_team!)}`}>
                          {topic.selected_by_team}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'topics' && (
          <div className="space-y-6">
            {/* Add Topic Form */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add New Topic</h3>
              <form onSubmit={addTopic} className="flex gap-3">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Enter topic title..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newTopic.trim()}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </form>
            </div>

            {/* Topics List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">All Topics ({topics.length})</h3>
              </div>
              <div className="p-4">
                {topics.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No topics added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="bg-gray-100 text-gray-600 font-bold text-sm w-8 h-8 rounded flex items-center justify-center">
                            {index + 1}
                          </div>
                          {topic.selected_by_team ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{topic.title}</div>
                            {topic.selected_by_team && (
                              <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getTeamColor(topic.selected_by_team)}`}>
                                Team {topic.selected_by_team}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {topic.selected_by_team && (
                            <button
                              onClick={() => resetSelection(topic.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                              title="Reset selection"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTopic(topic.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete topic"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Team Login Credentials</h3>
                <p className="text-sm text-gray-600 mt-1">Set username and password for each team</p>
              </div>
              <div className="p-4 space-y-4">
                {teamCredentials.map((cred) => (
                  <div key={cred.team_name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Team {cred.team_name}</h4>
                      {!editingCredentials[cred.team_name] && (
                        <button
                          onClick={() => startEditingCredentials(cred.team_name, cred.username, cred.password)}
                          className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 px-3 py-1 rounded hover:bg-primary-50 transition-colors text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </div>
                    
                    {editingCredentials[cred.team_name] ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                          <input
                            type="text"
                            value={editingCredentials[cred.team_name].username}
                            onChange={(e) => setEditingCredentials(prev => ({
                              ...prev,
                              [cred.team_name]: { ...prev[cred.team_name], username: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            placeholder="Enter username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="text"
                            value={editingCredentials[cred.team_name].password}
                            onChange={(e) => setEditingCredentials(prev => ({
                              ...prev,
                              [cred.team_name]: { ...prev[cred.team_name], password: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTeamCredentials(
                              cred.team_name,
                              editingCredentials[cred.team_name].username,
                              editingCredentials[cred.team_name].password
                            )}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={() => cancelEditingCredentials(cred.team_name)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 font-medium text-sm">Username:</span>
                          <div className="mt-1 font-mono bg-gray-50 px-3 py-2 rounded border text-sm">
                            {cred.username || 'Not set'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium text-sm">Password:</span>
                          <div className="mt-1 font-mono bg-gray-50 px-3 py-2 rounded border text-sm flex items-center justify-between">
                            <span>
                              {showPasswords[cred.team_name] 
                                ? (cred.password || 'Not set')
                                : '••••••••'
                              }
                            </span>
                            <button
                              onClick={() => setShowPasswords(prev => ({
                                ...prev,
                                [cred.team_name]: !prev[cred.team_name]
                              }))}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords[cred.team_name] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}