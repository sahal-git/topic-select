import React, { useState, useEffect } from 'react';
import { supabase, Topic, ItemWithData, Team } from '../lib/supabase';
import { ChevronRight, CheckCircle, Users, Trophy, Clock, Shield, FolderOpen, ChevronDown, Check, Star } from 'lucide-react';

interface TeamSelectionProps {
  team: Team;
}

export default function TeamSelection({ team }: TeamSelectionProps) {
  const [items, setItems] = useState<ItemWithData[]>([]);
  const [isAppLive, setIsAppLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmationToast, setShowConfirmationToast] = useState<{ message: string } | null>(null);
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

      const itemsToExpand = new Set<string>();
      itemsWithData.forEach(item => {
        const teamHasCompleted = item.topics.some(t => t.selected_by_team === team);
        if (!teamHasCompleted && item.topics.some(t => !t.selected_by_team)) {
          itemsToExpand.add(item.id);
        }
      });
      setExpandedItems(prev => new Set([...prev, ...itemsToExpand]));

    } catch (error) {
      console.error('Error fetching items and topics:', error);
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
    fetchAppLiveStatus();

    const refreshInterval = setInterval(fetchData, 2000);
    const appStatusInterval = setInterval(fetchAppLiveStatus, 5000);
    
    const channel = supabase
      .channel(`realtime-updates-${team}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      clearInterval(appStatusInterval);
      supabase.removeChannel(channel);
    };
  }, [team]);

  const selectTopic = async (topic: Topic) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('topics')
        .update({ selected_by_team: team })
        .eq('id', topic.id)
        .is('selected_by_team', null);

      if (error) throw error;

      setShowConfirmationToast({ message: `Selected "${topic.title}"` });
      setTimeout(() => setShowConfirmationToast(null), 3000);
      fetchData();

    } catch (error) {
      console.error('Error selecting topic:', error);
    } finally {
      setIsLoading(false);
    }
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

  const getTeamConfig = (team: Team) => {
    switch (team) {
      case 'Almaria': return { bgColor: 'bg-blue-500', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' };
      case 'Tolido': return { bgColor: 'bg-green-500', bgLight: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' };
      case 'Zaragoza': return { bgColor: 'bg-purple-500', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-800' };
    }
  };

  const config = getTeamConfig(team);
  
  const completedCount = items.reduce((count, item) => {
    return count + (item.topics.some(t => t.selected_by_team === team) ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-3 ${config.bgColor} text-white p-4 rounded-xl mb-4`}>
              <Users className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Team {team}</h1>
            </div>
            <p className="text-gray-600">
              Select one topic from each category below.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border">
          {!isAppLive ? (
            <div className="p-8 text-center">
              <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">System Offline</h2>
              <p className="text-gray-600">The topic selection is currently not live. Please wait for the admin to start the event.</p>
            </div>
          ) : (
            <>
              <div className={`${config.bgLight} px-6 py-4 border-b ${config.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className={`font-medium ${config.textColor} flex items-center gap-2`}>
                    <Trophy className="h-5 w-5" />
                    <span>Completed: {completedCount} / {items.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No categories have been added yet.</p>
                      <p className="text-gray-500 text-sm">Please wait for the admin to set up the event.</p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const teamSelection = item.topics.find(t => t.selected_by_team === team);
                      const isItemCompleted = !!teamSelection;

                      return (
                        <div key={item.id} className={`border rounded-lg overflow-hidden transition-all ${isItemCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                          <button
                            onClick={() => toggleItemExpansion(item.id)}
                            className={`w-full p-4 text-left transition-colors ${isItemCompleted ? 'hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isItemCompleted ? <CheckCircle className="h-6 w-6 text-green-600" /> : (expandedItems.has(item.id) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />)}
                                <div>
                                  <div className={`font-semibold text-lg ${isItemCompleted ? 'text-green-900' : 'text-gray-900'}`}>{item.title}</div>
                                  <div className="text-sm text-gray-600">{item.topics.filter(t => !t.selected_by_team).length} topics available</div>
                                </div>
                              </div>
                              <div className={`text-sm font-medium px-3 py-1 rounded-full ${isItemCompleted ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                                {isItemCompleted ? 'Completed' : 'Pending'}
                              </div>
                            </div>
                          </button>

                          {expandedItems.has(item.id) && (
                            <div className="border-t bg-white p-4">
                              {isItemCompleted ? (
                                <div className="p-4 rounded-lg bg-white border-2 border-dashed border-green-300 flex items-center gap-2">
                                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                                  <div>
                                    <p className="text-sm text-green-800 font-medium">Your selection:</p>
                                    <span className="text-lg font-bold text-green-900">{teamSelection!.title}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {item.topics.map((topic) => (
                                    <button
                                      key={topic.id}
                                      onClick={() => selectTopic(topic)}
                                      disabled={isLoading || !!topic.selected_by_team}
                                      className={`w-full text-left p-3 border rounded-lg transition-all flex items-center justify-between ${
                                        topic.selected_by_team
                                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                          : 'bg-white hover:bg-primary-50 hover:border-primary-500'
                                      }`}
                                    >
                                      <span className="font-medium">{topic.title}</span>
                                      {topic.selected_by_team ? (
                                        <span className="text-xs font-semibold text-red-600">Taken by Team {topic.selected_by_team}</span>
                                      ) : (
                                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1"><Check className="h-4 w-4" /> Available</span>
                                      )}
                                    </button>
                                  ))}
                                  {item.topics.length === 0 && <p className="text-gray-500 text-sm">No topics available for this item yet.</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showConfirmationToast && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-in">
          <CheckCircle className="h-5 w-5" />
          <div>
            <div className="font-bold">Success!</div>
            <div className="text-sm text-green-100">{showConfirmationToast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
