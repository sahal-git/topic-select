import React, { useState, useEffect } from 'react';
import { supabase, Topic, Team, AppSettings } from '../lib/supabase';
import { ChevronRight, CheckCircle, Users, Trophy, Clock, Star, Shield } from 'lucide-react';

interface TeamSelectionProps {
  team: Team;
}

export default function TeamSelection({ team }: TeamSelectionProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isAppLive, setIsAppLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchTopics();
    fetchAppLiveStatus();

    const refreshInterval = setInterval(() => {
      fetchTopics();
      fetchAppLiveStatus();
    }, 1000);
    
    const channel = supabase
      .channel(`topics-${team}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'topics' },
        (payload) => {
          setTopics(prev => [...prev, payload.new as Topic]);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'topics' },
        (payload) => {
          const updatedTopic = payload.new as Topic;
          setTopics(prev => prev.map(topic => 
            topic.id === updatedTopic.id ? updatedTopic : topic
          ));
          
          if (updatedTopic.selected_by_team === team) {
            setSelectedTopic(updatedTopic);
            if (!selectedTopic) {
              setShowConfirmation(true);
              setTimeout(() => setShowConfirmation(false), 3000);
            }
          } else if (selectedTopic && selectedTopic.id === updatedTopic.id && updatedTopic.selected_by_team !== team) {
            setSelectedTopic(null);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'topics' },
        (payload) => {
          setTopics(prev => prev.filter(topic => topic.id !== payload.old.id));
          if (selectedTopic && selectedTopic.id === payload.old.id) {
            setSelectedTopic(null);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [team]);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const allTopics = data || [];
      setTopics(allTopics);
      
      const teamSelection = allTopics.find(topic => topic.selected_by_team === team);
      setSelectedTopic(teamSelection || null);
    } catch (error) {
      console.error('Error fetching topics:', error);
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

  const selectTopic = async (topicId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('topics')
        .update({ selected_by_team: team })
        .eq('id', topicId)
        .is('selected_by_team', null);

      if (error) throw error;
    } catch (error) {
      console.error('Error selecting topic:', error);
      fetchTopics();
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamConfig = (team: Team) => {
    switch (team) {
      case 'Almaria':
        return {
          bgColor: 'bg-blue-500',
          bgLight: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
      case 'Tolido':
        return {
          bgColor: 'bg-green-500',
          bgLight: 'bg-green-50',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      case 'Zaragoza':
        return {
          bgColor: 'bg-purple-500',
          bgLight: 'bg-purple-50',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
    }
  };

  const config = getTeamConfig(team);
  const availableTopics = topics.filter(topic => !topic.selected_by_team);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-3 ${config.bgColor} text-white p-4 rounded-xl mb-4`}>
              <Users className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Team {team}</h1>
            </div>
            <p className="text-gray-600">
              {selectedTopic ? 'Topic selected successfully!' : 'Choose your fest topic'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border">
          {!isAppLive ? (
            /* Waiting State */
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3 text-orange-600 mb-6">
                <div className="bg-orange-100 p-4 rounded-full">
                  <Shield className="h-12 w-12" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Controller's Permission</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The topic selection is currently offline. Please wait for the event controller to make the system live.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-full border border-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>System Offline</span>
              </div>
            </div>
          ) : (
            <>
          {/* Status Bar */}
          <div className={`${config.bgLight} px-6 py-4 border-b ${config.borderColor}`}>
            <div className="flex items-center justify-between">
              <div className={`font-medium ${config.textColor} flex items-center gap-2`}>
                {selectedTopic ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Topic Selected
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5" />
                    Selection in Progress
                  </>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {availableTopics.length} available
              </div>
            </div>
          </div>

          <div className="p-6">
            {selectedTopic ? (
              /* Selected State - Compact */
              <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 text-green-600 mb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Trophy className="h-8 w-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Congratulations!</h2>
                <div className="bg-gray-50 rounded-lg p-6 border max-w-2xl mx-auto">
                  <div className="text-xl font-bold text-gray-900 mb-2">
                    {selectedTopic.title}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.bgLight} ${config.textColor} border ${config.borderColor}`}>
                    Selected by Team {team}
                  </div>
                </div>
                <p className="text-gray-600 max-w-xl mx-auto">
                  Your team has successfully selected this topic. Good luck with your presentation!
                </p>
              </div>
            ) : (
              /* Selection Interface - Compact */
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Topic</h2>
                  <p className="text-gray-600">
                    <span className="font-semibold text-primary-600">{availableTopics.length}</span> topics available
                  </p>
                </div>

                {availableTopics.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Users className="h-16 w-16 mx-auto" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 mb-2">
                      No Topics Available
                    </div>
                    <p className="text-gray-600">
                      All topics have been selected by other teams.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableTopics.map((topic, index) => (
                      <button
                        key={topic.id}
                        onClick={() => selectTopic(topic.id)}
                        disabled={isLoading}
                        className="w-full p-4 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 text-gray-600 font-bold text-sm w-8 h-8 rounded flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 group-hover:text-gray-700 mb-1">
                                {topic.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                Click to select for your team
                              </div>
                            </div>
                          </div>
                          <div className={`${config.textColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Toast */}
      {showConfirmation && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Topic selected!</span>
        </div>
      )}
    </div>
  );
}