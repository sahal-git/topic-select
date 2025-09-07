import React, { useState, useEffect } from 'react';
import { supabase, Topic, ItemWithData, TeamCredentials, TEAMS } from '../lib/supabase';
import { Plus, Trash2, RefreshCw, Users, CheckCircle, Circle, Key, Save, Shield, Edit, Trophy, BarChart3, LogOut, Eye, EyeOff, Power, PowerOff, FolderOpen, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';

interface AdminPanelProps {}

export default function AdminPanel({}: AdminPanelProps) {
  const [items, setItems] = useState<ItemWithData[]>([]);
  const [teamCredentials, setTeamCredentials] = useState<TeamCredentials[]>([]);
  const [isAppLive, setIsAppLive] = useState(false);
  
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [selectedItemIdForTopic, setSelectedItemIdForTopic] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingLiveStatus, setIsUpdatingLiveStatus] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState<{[key: string]: {username: string, password: string}}>({});
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'credentials'>('overview');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: true });
      if (itemsError) throw itemsError;

      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: true });
      if (topicsError) throw topicsError;

      const itemsWithData = (itemsData || []).map(item => ({
        ...item,
        topics: (topicsData || []).filter(topic => topic.item_id === item.id),
      }));

      setItems(itemsWithData);

      const itemsWithTopicsIds = new Set(
        itemsWithData.filter(item => item.topics.length > 0).map(item => item.id)
      );
      setExpandedItems(prev => new Set([...prev, ...itemsWithTopicsIds]));

      if (itemsWithData.length > 0 && !selectedItemIdForTopic) {
        setSelectedItemIdForTopic(itemsWithData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchTeamCredentials = async () => {
    try {
      const { data, error } = await supabase.from('team_credentials').select('*');
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

  useEffect(() => {
    fetchData();
    fetchTeamCredentials();
    fetchAppLiveStatus();

    const refreshInterval = setInterval(() => {
      fetchData();
      fetchTeamCredentials();
      fetchAppLiveStatus();
    }, 2000);
    
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleAppLiveStatus = async () => {
    setIsUpdatingLiveStatus(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: !isAppLive ? 'true' : 'false' })
        .eq('key', 'app_live');
      if (error) throw error;
      setIsAppLive(!isAppLive);
    } catch (error) {
      console.error('Error toggling app status:', error);
    } finally {
      setIsUpdatingLiveStatus(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .insert([{ title: newItemTitle.trim() }]);

      if (error) throw error;
      setNewItemTitle('');
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !selectedItemIdForTopic) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('topics')
        .insert([{ 
          title: newTopicTitle.trim(),
          item_id: selectedItemIdForTopic
        }]);

      if (error) throw error;
      setNewTopicTitle('');
    } catch (error) {
      console.error('Error adding topic:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item and all its topics?')) {
      try {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const deleteTopic = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        const { error } = await supabase.from('topics').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting topic:', error);
      }
    }
  };

  const resetTopicSelection = async (id: string) => {
    if (window.confirm('Are you sure you want to reset this selection?')) {
      try {
        const { error } = await supabase.from('topics').update({ selected_by_team: null }).eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error('Error resetting selection:', error);
      }
    }
  };

  const resetAllSelections = async () => {
    if (window.confirm('Are you sure you want to reset ALL topic selections? This cannot be undone.')) {
      try {
        const { error } = await supabase.from('topics').update({ selected_by_team: null }).neq('selected_by_team', 'null');
        if (error) throw error;
      } catch (error) {
        console.error('Error resetting all selections:', error);
      }
    }
  };

  const updateTeamCredentials = async (teamName: string, username: string, password: string) => {
    try {
      const { error } = await supabase
        .from('team_credentials')
        .update({ username, password })
        .eq('team_name', teamName);
      if (error) throw error;
      cancelEditingCredentials(teamName);
    } catch (error) {
      console.error('Error updating credentials:', error);
    }
  };

  const startEditingCredentials = (teamName: string, currentUsername: string, currentPassword: string) => {
    setEditingCredentials(prev => ({...prev, [teamName]: {username: currentUsername, password: currentPassword}}));
  };

  const cancelEditingCredentials = (teamName: string) => {
    setEditingCredentials(prev => {
      const newState = {...prev};
      delete newState[teamName];
      return newState;
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'Almaria': return 'bg-blue-100 text-blue-800';
      case 'Tolido': return 'bg-green-100 text-green-800';
      case 'Zaragoza': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const allTopics = items.flatMap(item => item.topics);
  const selectedTopics = allTopics.filter(topic => topic.selected_by_team);

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'items', label: 'Items & Topics', icon: FolderOpen },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${isAppLive ? 'text-green-600' : 'text-red-600'}`}>
                  {isAppLive ? 'LIVE' : 'OFF'}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">App Status</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600 mb-1">{items.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Items</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{allTopics.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Topics</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{selectedTopics.length}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">Selected</div>
              </div>
            </div>
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
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Recent Selections</h3>
              </div>
              <div className="p-4">
                {selectedTopics.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No selections yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTopics.slice(0, 5).map((topic) => {
                      const item = items.find(item => item.id === topic.item_id);
                      return (
                        <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{topic.title}</div>
                            <div className="text-xs text-gray-500">
                              {item?.title} • Selected by Team {topic.selected_by_team}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getTeamColor(topic.selected_by_team!)}`}>
                            {topic.selected_by_team}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add New Item (Category)</h3>
              <form onSubmit={addItem} className="flex items-center gap-3">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="New item title..."
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !newItemTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </form>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add New Topic</h3>
              <form onSubmit={addTopic} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={selectedItemIdForTopic}
                    onChange={(e) => setSelectedItemIdForTopic(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  >
                    <option value="">Select an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Topic title..."
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !newTopicTitle.trim() || !selectedItemIdForTopic}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add Topic
                </button>
              </form>
            </div>
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">All Items & Topics</h3>
              </div>
              <div className="p-4">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No items added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg">
                        <div className="p-4 bg-gray-50 flex items-center justify-between">
                          <button
                            onClick={() => toggleItemExpansion(item.id)}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            {expandedItems.has(item.id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                            <ListChecks className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">{item.title}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {item.topics.length} topics
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {expandedItems.has(item.id) && (
                          <div className="p-4 border-t border-gray-200">
                            {item.topics.length === 0 ? (
                              <p className="text-gray-500 text-sm">No topics in this item</p>
                            ) : (
                              <div className="space-y-2">
                                {item.topics.map((topic) => (
                                  <div key={topic.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div>
                                      <p className="font-medium text-gray-800">{topic.title}</p>
                                      {topic.selected_by_team ? (
                                        <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${getTeamColor(topic.selected_by_team)}`}>
                                          Selected by Team {topic.selected_by_team}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-green-600">Available</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {topic.selected_by_team && (
                                        <button onClick={() => resetTopicSelection(topic.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><RefreshCw className="h-4 w-4" /></button>
                                      )}
                                      <button onClick={() => deleteTopic(topic.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Team Credentials</h3>
              <div className="space-y-4">
                {teamCredentials.map((cred) => (
                  <div key={cred.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-lg mb-2">Team {cred.team_name}</h4>
                    {editingCredentials[cred.team_name] ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingCredentials[cred.team_name].username}
                          onChange={(e) => setEditingCredentials(prev => ({...prev, [cred.team_name]: {...prev[cred.team_name], username: e.target.value}}))}
                          placeholder="Username"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                        <input
                          type="text"
                          value={editingCredentials[cred.team_name].password}
                          onChange={(e) => setEditingCredentials(prev => ({...prev, [cred.team_name]: {...prev[cred.team_name], password: e.target.value}}))}
                          placeholder="Password"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => updateTeamCredentials(cred.team_name, editingCredentials[cred.team_name].username, editingCredentials[cred.team_name].password)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                          <button onClick={() => cancelEditingCredentials(cred.team_name)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Username: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cred.username || 'Not Set'}</span></p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600">Password: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{showPasswords[cred.team_name] ? cred.password : '••••••••' || 'Not Set'}</span></p>
                          <button onClick={() => setShowPasswords(p => ({...p, [cred.team_name]: !p[cred.team_name]}))} className="text-gray-500">
                            {showPasswords[cred.team_name] ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </button>
                        </div>
                        <button onClick={() => startEditingCredentials(cred.team_name, cred.username, cred.password)} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"><Edit className="h-3 w-3" /> Edit</button>
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
