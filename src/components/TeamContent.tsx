import React, { useState, useEffect } from 'react';
import { supabase, ContentItem, TeamContentSubmission, Team } from '../lib/supabase';
import { Save, FileText, Shield, Users, Trophy, CheckCircle, Clock, ArrowLeft, Link, Edit3, Send, PlusCircle } from 'lucide-react';

type FormData = { id: string | null; name: string; description: string; link: string };

interface TeamContentProps {
  team: Team;
  onViewChange?: (view: 'home' | 'admin' | Team | `${Team}-content`) => void;
}

export default function TeamContent({ team, onViewChange }: TeamContentProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [submissions, setSubmissions] = useState<TeamContentSubmission[]>([]);
  const [isAppLive, setIsAppLive] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showConfirmationToast, setShowConfirmationToast] = useState<{ message: string } | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: FormData[] }>({});

  const fetchData = async () => {
    try {
      // Fetch content items
      const { data: contentData, error: contentError } = await supabase
        .from('content_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (contentError) throw contentError;

      // Fetch team submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('team_content_submissions')
        .select('*')
        .eq('team_name', team);
      if (submissionsError) throw submissionsError;

      setContentItems(contentData || []);
      setSubmissions(submissionsData || []);

      // Initialize form data
      const initialFormData: { [key: string]: FormData[] } = {};
      (contentData || []).forEach(item => {
        const teamSubmissions = (submissionsData || [])
          .filter(sub => sub.content_item_id === item.id)
          .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

        const forms: FormData[] = [];
        for (let i = 0; i < 2; i++) {
          const submission = teamSubmissions[i];
          if (submission) {
            forms.push({
              id: submission.id,
              name: submission.content_name,
              description: submission.content_description || '',
              link: submission.content_link || '',
            });
          } else {
            forms.push({ id: null, name: '', description: '', link: '' });
          }
        }
        initialFormData[item.id] = forms;
      });
      setFormData(initialFormData);

    } catch (error) {
      console.error('Error fetching content data:', error);
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

    const channel = supabase
      .channel(`content-realtime-${team}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_content_submissions', filter: `team_name=eq.${team}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_live' }, fetchAppLiveStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team]);

  const updateFormData = (itemId: string, submissionIndex: number, field: 'name' | 'description' | 'link', value: string) => {
    setFormData(prev => {
      const newForms = [...(prev[itemId] || [])];
      newForms[submissionIndex] = {
        ...newForms[submissionIndex],
        [field]: value,
      };
      return {
        ...prev,
        [itemId]: newForms,
      };
    });
  };

  const submitContent = async (contentItemId: string, submissionIndex: number) => {
    const formState = formData[contentItemId][submissionIndex];
    if (!formState.name.trim()) return;
    
    const itemConfig = contentItems.find(ci => ci.id === contentItemId);
    if (itemConfig?.allow_links && !formState.link.trim()) {
        alert('Link is required for this item.');
        return;
    }

    setIsLoading(`${contentItemId}-${submissionIndex}`);
    try {
      const submissionData = {
        content_item_id: contentItemId,
        team_name: team,
        content_name: formState.name.trim(),
        content_description: formState.description.trim() || null,
        content_link: formState.link.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (formState.id) {
        // Update existing submission
        const { error } = await supabase
          .from('team_content_submissions')
          .update(submissionData)
          .eq('id', formState.id);
        if (error) throw error;
      } else {
        // Insert new submission
        const { error } = await supabase
          .from('team_content_submissions')
          .insert([submissionData]);
        if (error) throw error;
      }

      setShowConfirmationToast({ message: `Content ${formState.id ? 'updated' : 'submitted'} successfully!` });
      setTimeout(() => setShowConfirmationToast(null), 3000);
      fetchData();

    } catch (error) {
      console.error('Error submitting content:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const getTeamConfig = (team: Team) => {
    switch (team) {
      case 'Almaria': return { bgColor: 'bg-blue-500', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' };
      case 'Tolido': return { bgColor: 'bg-green-500', bgLight: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800' };
      case 'Zaragoza': return { bgColor: 'bg-purple-500', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-800' };
    }
  };

  const config = getTeamConfig(team);
  
  const completedCount = contentItems.reduce((count, item) => {
    const teamSubmissions = submissions.filter(s => s.content_item_id === item.id);
    return count + (teamSubmissions.length >= 2 ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-3 ${config.bgColor} text-white p-4 rounded-xl mb-4`}>
              <FileText className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Team {team} - Content Submission</h1>
            </div>
            <p className="text-gray-600 mb-4">
              Submit up to two entries for each category below.
            </p>
            
            {/* Navigation Tabs */}
            <div className="flex gap-2 justify-center">
              {onViewChange && (
                <button
                  onClick={() => onViewChange(team)}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Topic Selection
                </button>
              )}
              <div className={`px-4 py-2 rounded-lg font-medium ${config.bgColor} text-white`}>
                Content Submission
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border">
          {!isAppLive ? (
            <div className="p-8 text-center">
              <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">System Offline</h2>
              <p className="text-gray-600">The content submission is currently not live. Please wait for the admin to start the event.</p>
            </div>
          ) : (
            <>
              <div className={`${config.bgLight} px-6 py-4 border-b ${config.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className={`font-medium ${config.textColor} flex items-center gap-2`}>
                    <Trophy className="h-5 w-5" />
                    <span>Completed Categories: {completedCount} / {contentItems.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {contentItems.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No content categories have been added yet.</p>
                      <p className="text-gray-500 text-sm">Please wait for the admin to set up content items.</p>
                    </div>
                  ) : (
                    contentItems.map((item) => {
                      const teamSubmissions = submissions.filter(sub => sub.content_item_id === item.id);
                      const isComplete = teamSubmissions.length >= 2;
                      const forms = formData[item.id] || [];

                      return (
                        <div key={item.id} className={`border rounded-lg overflow-hidden transition-all ${isComplete ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                          <div className={`p-4 ${isComplete ? 'bg-green-100' : 'bg-gray-50'} border-b`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isComplete ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Clock className="h-6 w-6 text-orange-500" />}
                                <div>
                                  <h3 className={`font-semibold text-lg ${isComplete ? 'text-green-900' : 'text-gray-900'}`}>{item.title}</h3>
                                  {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                                </div>
                              </div>
                              <div className={`text-sm font-medium px-3 py-1 rounded-full ${isComplete ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'}`}>
                                Submitted {teamSubmissions.length} / 2
                              </div>
                            </div>
                          </div>

                          <div className="bg-white divide-y divide-gray-200">
                            {forms.map((form, index) => {
                              const isSubmitted = form.id !== null;
                              return (
                                <div key={index} className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-gray-700">Submission #{index + 1}</h4>
                                      {isSubmitted && (
                                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3"/>
                                          Submitted
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Content Name <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => updateFormData(item.id, index, 'name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        placeholder="Enter content name..."
                                        disabled={isLoading === `${item.id}-${index}`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                      </label>
                                      <textarea
                                        value={form.description}
                                        onChange={(e) => updateFormData(item.id, index, 'description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                                        placeholder="Enter content description..."
                                        disabled={isLoading === `${item.id}-${index}`}
                                      />
                                    </div>

                                    {item.allow_links && (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Link {item.allow_links && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                          <input
                                            type="url"
                                            value={form.link}
                                            onChange={(e) => updateFormData(item.id, index, 'link', e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            placeholder="https://example.com"
                                            disabled={isLoading === `${item.id}-${index}`}
                                            required={item.allow_links}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                      {isSubmitted && (
                                        <div className="text-sm text-gray-500">
                                          Last updated: {new Date(teamSubmissions.find(s => s.id === form.id)!.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                      )}
                                      <button
                                        onClick={() => submitContent(item.id, index)}
                                        disabled={isLoading === `${item.id}-${index}` || !form.name.trim() || (item.allow_links && !form.link.trim())}
                                        className={`ml-auto px-4 py-2 ${config.bgColor} hover:opacity-90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                                      >
                                        {isLoading === `${item.id}-${index}` ? (
                                          <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            {isSubmitted ? <Edit3 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                            {isSubmitted ? 'Update' : 'Submit'}
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
