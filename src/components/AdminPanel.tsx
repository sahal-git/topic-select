import React, { useState, useEffect } from 'react';
import { supabase, Topic, ItemWithData, TeamCredentials, TEAMS, ContentItem, TeamContentSubmission, ContentItemWithSubmissions, Schedule } from '../lib/supabase';
import { Plus, Trash2, RefreshCw, Users, CheckCircle, Circle, Key, Save, Shield, Edit, Trophy, BarChart3, LogOut, Eye, EyeOff, Power, PowerOff, FolderOpen, ChevronDown, ChevronRight, ListChecks, FileText, Link, ToggleLeft, ToggleRight, Download, Clock } from 'lucide-react';

interface AdminPanelProps {}

export default function AdminPanel({}: AdminPanelProps) {
  const [items, setItems] = useState<ItemWithData[]>([]);
  const [teamCredentials, setTeamCredentials] = useState<TeamCredentials[]>([]);
  const [contentItems, setContentItems] = useState<ContentItemWithSubmissions[]>([]);
  const [isManualOverrideLive, setIsManualOverrideLive] = useState(false);
  const [schedule, setSchedule] = useState<Partial<Schedule>>({});
  const [isAppActuallyLive, setIsAppActuallyLive] = useState(false);

  const [scheduleInputs, setScheduleInputs] = useState({ live_from: '', offline_at: '' });
  
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [selectedItemIdForTopic, setSelectedItemIdForTopic] = useState('');
  const [newContentItemTitle, setNewContentItemTitle] = useState('');
  const [newContentItemDescription, setNewContentItemDescription] = useState('');
  const [newContentItemAllowLinks, setNewContentItemAllowLinks] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingLiveStatus, setIsUpdatingLiveStatus] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState<{[key: string]: {username: string, password: string}}>({});
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'credentials' | 'content'>('overview');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedContentItems, setExpandedContentItems] = useState<Set<string>>(new Set());

  const calculateActualLiveStatus = (manualStatus: boolean, scheduleData: Partial<Schedule>) => {
    if (!manualStatus) {
      setIsAppActuallyLive(false);
      return;
    }

    const now = new Date();
    const liveFrom = scheduleData.live_from ? new Date(scheduleData.live_from) : null;
    const offlineAt = scheduleData.offline_at ? new Date(scheduleData.offline_at) : null;

    let isScheduledLive = false;
    if (liveFrom && offlineAt) {
      isScheduledLive = now >= liveFrom && now < offlineAt;
    } else if (liveFrom) {
      isScheduledLive = now >= liveFrom;
    } else if (offlineAt) {
      isScheduledLive = now < offlineAt;
    } else {
      isScheduledLive = true;
    }
    setIsAppActuallyLive(manualStatus && isScheduledLive);
  };

  const fetchData = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase.from('items').select('*').order('created_at', { ascending: true });
      if (itemsError) throw itemsError;
      const { data: topicsData, error: topicsError } = await supabase.from('topics').select('*').order('created_at', { ascending: true });
      if (topicsError) throw topicsError;
      const itemsWithData = (itemsData || []).map(item => ({ ...item, topics: (topicsData || []).filter(topic => topic.item_id === item.id) }));
      setItems(itemsWithData);
      const itemsWithTopicsIds = new Set(itemsWithData.filter(item => item.topics.length > 0).map(item => item.id));
      setExpandedItems(prev => new Set([...prev, ...itemsWithTopicsIds]));
      if (itemsWithData.length > 0 && !selectedItemIdForTopic) setSelectedItemIdForTopic(itemsWithData[0].id);
    } catch (error) { console.error('Error fetching data:', error); }
  };

  const fetchContentData = async () => {
    try {
      const { data: contentData, error: contentError } = await supabase.from('content_items').select('*').order('created_at', { ascending: true });
      if (contentError) throw contentError;
      const { data: submissionsData, error: submissionsError } = await supabase.from('team_content_submissions').select('*').order('submitted_at', { ascending: false });
      if (submissionsError) throw submissionsError;
      const contentWithSubmissions = (contentData || []).map(item => ({ ...item, submissions: (submissionsData || []).filter(submission => submission.content_item_id === item.id) }));
      setContentItems(contentWithSubmissions);
      const itemsWithSubmissionsIds = new Set(contentWithSubmissions.filter(item => item.submissions.length > 0).map(item => item.id));
      setExpandedContentItems(prev => new Set([...prev, ...itemsWithSubmissionsIds]));
    } catch (error) { console.error('Error fetching content data:', error); }
  };

  const fetchTeamCredentials = async () => {
    try {
      const { data, error } = await supabase.from('team_credentials').select('*');
      if (error) throw error;
      setTeamCredentials(data || []);
    } catch (error) { console.error('Error fetching team credentials:', error); }
  };
  
  const fetchAppStatus = async () => {
    try {
      const { data: overrideData, error: overrideError } = await supabase.from('app_settings').select('value').eq('key', 'app_live').single();
      if (overrideError) throw overrideError;
      const manualStatus = overrideData?.value === 'true';
      setIsManualOverrideLive(manualStatus);

      const { data: scheduleData, error: scheduleError } = await supabase.from('app_schedule').select('*').eq('id', 1).single();
      if (scheduleError) throw scheduleError;
      setSchedule(scheduleData || {});
      
      const formatForInput = (dateString: string | null | undefined) => dateString ? dateString.slice(0, 16) : '';
      setScheduleInputs({
        live_from: formatForInput(scheduleData?.live_from),
        offline_at: formatForInput(scheduleData?.offline_at),
      });

      calculateActualLiveStatus(manualStatus, scheduleData || {});
    } catch (error) { console.error('Error fetching app status:', error); }
  };

  useEffect(() => {
    const loadAllData = () => {
      fetchData();
      fetchContentData();
      fetchTeamCredentials();
      fetchAppStatus();
    };
    loadAllData();
    const intervalId = setInterval(loadAllData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const toggleManualOverride = async () => {
    setIsUpdatingLiveStatus(true);
    try {
      const { error } = await supabase.from('app_settings').update({ value: !isManualOverrideLive ? 'true' : 'false' }).eq('key', 'app_live');
      if (error) throw error;
      const newStatus = !isManualOverrideLive;
      setIsManualOverrideLive(newStatus);
      calculateActualLiveStatus(newStatus, schedule);
    } catch (error) { console.error('Error toggling app status:', error); } 
    finally { setIsUpdatingLiveStatus(false); }
  };

  const handleSaveSchedule = async () => {
    setIsUpdatingLiveStatus(true);
    try {
      const { data, error } = await supabase.from('app_schedule').update({
        live_from: scheduleInputs.live_from || null,
        offline_at: scheduleInputs.offline_at || null,
      }).eq('id', 1).select().single();
      if (error) throw error;
      setSchedule(data);
      calculateActualLiveStatus(isManualOverrideLive, data);
    } catch (error) { console.error('Error saving schedule:', error); }
    finally { setIsUpdatingLiveStatus(false); }
  };

  const handleClearSchedule = async () => {
    if (window.confirm('Are you sure you want to clear the schedule?')) {
      setScheduleInputs({ live_from: '', offline_at: '' });
      setIsUpdatingLiveStatus(true);
      try {
        const { data, error } = await supabase.from('app_schedule').update({ live_from: null, offline_at: null }).eq('id', 1).select().single();
        if (error) throw error;
        setSchedule(data);
        calculateActualLiveStatus(isManualOverrideLive, data);
      } catch (error) { console.error('Error clearing schedule:', error); }
      finally { setIsUpdatingLiveStatus(false); }
    }
  };

  const addItem = async (e: React.FormEvent) => { e.preventDefault(); if (!newItemTitle.trim()) return; setIsLoading(true); try { const { error } = await supabase.from('items').insert([{ title: newItemTitle.trim() }]); if (error) throw error; setNewItemTitle(''); } catch (error) { console.error('Error adding item:', error); } finally { setIsLoading(false); } };
  const addTopic = async (e: React.FormEvent) => { e.preventDefault(); if (!newTopicTitle.trim() || !selectedItemIdForTopic) return; setIsLoading(true); try { const { error } = await supabase.from('topics').insert([{ title: newTopicTitle.trim(), item_id: selectedItemIdForTopic }]); if (error) throw error; setNewTopicTitle(''); } catch (error) { console.error('Error adding topic:', error); } finally { setIsLoading(false); } };
  const addContentItem = async (e: React.FormEvent) => { e.preventDefault(); if (!newContentItemTitle.trim()) return; setIsLoading(true); try { const { error } = await supabase.from('content_items').insert([{ title: newContentItemTitle.trim(), description: newContentItemDescription.trim() || null, allow_links: newContentItemAllowLinks }]); if (error) throw error; setNewContentItemTitle(''); setNewContentItemDescription(''); setNewContentItemAllowLinks(false); } catch (error) { console.error('Error adding content item:', error); } finally { setIsLoading(false); } };
  const deleteItem = async (id: string) => { if (window.confirm('Are you sure?')) { try { const { error } = await supabase.from('items').delete().eq('id', id); if (error) throw error; } catch (error) { console.error('Error deleting item:', error); } } };
  const deleteTopic = async (id: string) => { if (window.confirm('Are you sure?')) { try { const { error } = await supabase.from('topics').delete().eq('id', id); if (error) throw error; } catch (error) { console.error('Error deleting topic:', error); } } };
  const deleteContentItem = async (id: string) => { if (window.confirm('Are you sure?')) { try { const { error } = await supabase.from('content_items').delete().eq('id', id); if (error) throw error; } catch (error) { console.error('Error deleting content item:', error); } } };
  const deleteSubmission = async (submissionId: string) => { if (window.confirm('Are you sure?')) { try { const { error } = await supabase.from('team_content_submissions').delete().eq('id', submissionId); if (error) throw error; } catch (error) { console.error('Error deleting submission:', error); } } };
  const resetTeamSubmissionsForContentItem = async (contentItemId: string, teamName: string) => { if (window.confirm(`Reset for ${teamName}?`)) { try { const { error } = await supabase.from('team_content_submissions').delete().eq('content_item_id', contentItemId).eq('team_name', teamName); if (error) throw error; } catch (error) { console.error('Error resetting team submissions:', error); } } };
  const toggleContentItemStatus = async (id: string, currentStatus: boolean) => { try { const { error } = await supabase.from('content_items').update({ is_active: !currentStatus }).eq('id', id); if (error) throw error; } catch (error) { console.error('Error toggling content item status:', error); } };
  const resetTopicSelection = async (id: string) => { if (window.confirm('Reset selection?')) { try { const { error } = await supabase.from('topics').update({ selected_by_team: null }).eq('id', id); if (error) throw error; } catch (error) { console.error('Error resetting selection:', error); } } };
  const resetAllSelections = async () => { if (window.confirm('Reset ALL topic selections?')) { try { const { error } = await supabase.from('topics').update({ selected_by_team: null }).neq('selected_by_team', 'null'); if (error) throw error; } catch (error) { console.error('Error resetting all selections:', error); } } };
  const resetAllContentSubmissions = async () => { if (window.confirm('Delete ALL content submissions?')) { try { const { error } = await supabase.from('team_content_submissions').delete().gt('id', '00000000-0000-0000-0000-000000000000'); if (error) throw error; } catch (error) { console.error('Error resetting all content submissions:', error); alert('Failed to reset.'); } } };
  const updateTeamCredentials = async (teamName: string, username: string, password: string) => { try { const { error } = await supabase.from('team_credentials').update({ username, password }).eq('team_name', teamName); if (error) throw error; cancelEditingCredentials(teamName); } catch (error) { console.error('Error updating credentials:', error); } };
  const startEditingCredentials = (teamName: string, currentUsername: string, currentPassword: string) => { setEditingCredentials(prev => ({...prev, [teamName]: {username: currentUsername, password: currentPassword}})); };
  const cancelEditingCredentials = (teamName: string) => { setEditingCredentials(prev => { const newState = {...prev}; delete newState[teamName]; return newState; }); };
  const handleSignOut = async () => { await supabase.auth.signOut(); };
  const escapeCSV = (str: any): string => { if (str === null || str === undefined) return ''; let result = String(str); if (result.search(/("|,|\n)/g) >= 0) { result = result.replace(/"/g, '""'); result = `"${result}"`; } return result; };
  const convertToCSV = (data: Record<string, any>[], headers: Record<string, string>) => { const headerKeys = Object.keys(headers); const headerDisplay = Object.values(headers); const headerRow = headerDisplay.join(','); const rows = data.map(row => headerKeys.map(key => escapeCSV(row[key])).join(',')); return [headerRow, ...rows].join('\n'); };
  const downloadCSV = (csvString: string, filename: string) => { const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); };
  const exportTopicSelections = () => { const dataToExport: any[] = []; items.forEach(item => item.topics.forEach(topic => dataToExport.push({ category: item.title, topic: topic.title, team: topic.selected_by_team || 'Not Selected', timestamp: topic.selected_by_team ? new Date(topic.updated_at).toLocaleString() : '' }))); const headers = { category: 'Category', topic: 'Topic', team: 'Selected By Team', timestamp: 'Selection Timestamp' }; const csv = convertToCSV(dataToExport, headers); downloadCSV(csv, `topic_selections_${new Date().toISOString().split('T')[0]}.csv`); };
  const exportContentSubmissions = () => { const dataToExport: any[] = []; contentItems.forEach(contentItem => { if (contentItem.submissions.length > 0) { contentItem.submissions.forEach(submission => dataToExport.push({ category: contentItem.title, team: submission.team_name, name: submission.content_name, description: submission.content_description, link: submission.content_link, submitted_at: new Date(submission.submitted_at).toLocaleString(), updated_at: new Date(submission.updated_at).toLocaleString() })); } else { dataToExport.push({ category: contentItem.title, team: 'No Submission', name: '', description: '', link: '', submitted_at: '', updated_at: '' }); } }); const headers = { category: 'Content Category', team: 'Team', name: 'Submission Name', description: 'Submission Description', link: 'Submission Link', submitted_at: 'Submitted At', updated_at: 'Last Updated At' }; const csv = convertToCSV(dataToExport, headers); downloadCSV(csv, `content_submissions_${new Date().toISOString().split('T')[0]}.csv`); };
  const toggleItemExpansion = (itemId: string) => { setExpandedItems(prev => { const newSet = new Set(prev); if (newSet.has(itemId)) newSet.delete(itemId); else newSet.add(itemId); return newSet; }); };
  const toggleContentItemExpansion = (itemId: string) => { setExpandedContentItems(prev => { const newSet = new Set(prev); if (newSet.has(itemId)) newSet.delete(itemId); else newSet.add(itemId); return newSet; }); };
  const getTeamColor = (team: string) => { switch (team) { case 'Almaria': return 'bg-blue-100 text-blue-800'; case 'Tolido': return 'bg-green-100 text-green-800'; case 'Zaragoza': return 'bg-purple-100 text-purple-800'; default: return 'bg-gray-100 text-gray-800'; } };
  const allTopics = items.flatMap(item => item.topics);
  const selectedTopics = allTopics.filter(topic => topic.selected_by_team);
  const allSubmissions = contentItems.flatMap(item => item.submissions);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-500 p-2 rounded-lg"><Shield className="h-6 w-6 text-white" /></div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign Out</span></button>
          </div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[{ id: 'overview', label: 'Overview', icon: BarChart3 }, { id: 'items', label: 'Items & Topics', icon: FolderOpen }, { id: 'content', label: 'Content Items', icon: FileText }, { id: 'credentials', label: 'Teams', icon: Key }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id as any)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}><Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span></button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${isAppActuallyLive ? 'text-green-600' : 'text-red-600'}`}>{isAppActuallyLive ? 'LIVE' : 'OFF'}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">App Status</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center"><div className="text-2xl font-bold text-indigo-600 mb-1">{items.length}</div><div className="text-xs text-gray-600 uppercase tracking-wide">Items</div></div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center"><div className="text-2xl font-bold text-blue-600 mb-1">{allTopics.length}</div><div className="text-xs text-gray-600 uppercase tracking-wide">Topics</div></div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center"><div className="text-2xl font-bold text-green-600 mb-1">{selectedTopics.length}</div><div className="text-xs text-gray-600 uppercase tracking-wide">Selected</div></div>
              <div className="bg-white rounded-lg shadow-sm border p-4 text-center"><div className="text-2xl font-bold text-purple-600 mb-1">{allSubmissions.length}</div><div className="text-xs text-gray-600 uppercase tracking-wide">Content Submitted</div></div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">App Control & Scheduling</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Manual Override</h4>
                  <div className="flex items-center gap-4">
                    <button onClick={toggleManualOverride} disabled={isUpdatingLiveStatus} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isManualOverrideLive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                      {isManualOverrideLive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      {isUpdatingLiveStatus ? 'Updating...' : (isManualOverrideLive ? 'Force Offline' : 'Enable App')}
                    </button>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${isManualOverrideLive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium text-gray-700">App is {isManualOverrideLive ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">If disabled, the app will be offline regardless of the schedule.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Event Schedule (Optional)</h4>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Live From</label>
                      <input type="datetime-local" value={scheduleInputs.live_from} onChange={e => setScheduleInputs(p => ({...p, live_from: e.target.value}))} className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"/>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Offline At</label>
                      <input type="datetime-local" value={scheduleInputs.offline_at} onChange={e => setScheduleInputs(p => ({...p, offline_at: e.target.value}))} className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"/>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveSchedule} disabled={isUpdatingLiveStatus} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
                      <button onClick={handleClearSchedule} disabled={isUpdatingLiveStatus} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={resetAllSelections} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Reset All Topics</button>
                <button onClick={resetAllContentSubmissions} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Trash2 className="h-4 w-4" /> Reset All Content</button>
                <button onClick={exportTopicSelections} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Download className="h-4 w-4" /> Export Topics</button>
                <button onClick={exportContentSubmissions} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><Download className="h-4 w-4" /> Export Content</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border"><div className="p-4 border-b"><h3 className="font-semibold text-gray-900">Recent Topic Selections</h3></div><div className="p-4">{selectedTopics.length === 0 ? <p className="text-gray-500 text-center py-4">No selections yet</p> : <div className="space-y-3">{selectedTopics.slice(0, 5).map((topic) => { const item = items.find(item => item.id === topic.item_id); return ( <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex-1"><div className="font-medium text-gray-900 text-sm">{topic.title}</div><div className="text-xs text-gray-500">{item?.title} • Selected by Team {topic.selected_by_team}</div></div><div className={`px-2 py-1 rounded text-xs font-medium ${getTeamColor(topic.selected_by_team!)}`}>{topic.selected_by_team}</div></div> ); })}</div>}</div></div>
              <div className="bg-white rounded-lg shadow-sm border"><div className="p-4 border-b"><h3 className="font-semibold text-gray-900">Recent Content Submissions</h3></div><div className="p-4">{allSubmissions.length === 0 ? <p className="text-gray-500 text-center py-4">No submissions yet</p> : <div className="space-y-3">{allSubmissions.slice(0, 5).map((submission) => { const contentItem = contentItems.find(item => item.id === submission.content_item_id); return ( <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex-1"><div className="font-medium text-gray-900 text-sm">{submission.content_name}</div><div className="text-xs text-gray-500">{contentItem?.title} • Team {submission.team_name}</div></div><div className={`px-2 py-1 rounded text-xs font-medium ${getTeamColor(submission.team_name)}`}>{submission.team_name}</div></div> ); })}</div>}</div></div>
            </div>
          </div>
        )}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4"><h3 className="font-semibold text-gray-900 mb-3">Add New Content Item</h3><form onSubmit={addContentItem} className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input type="text" value={newContentItemTitle} onChange={(e) => setNewContentItemTitle(e.target.value)} placeholder="Content item title..." className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" disabled={isLoading} /><input type="text" value={newContentItemDescription} onChange={(e) => setNewContentItemDescription(e.target.value)} placeholder="Description (optional)..." className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" disabled={isLoading} /></div><div className="flex items-center gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={newContentItemAllowLinks} onChange={(e) => setNewContentItemAllowLinks(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" disabled={isLoading} /><span className="text-sm text-gray-700">Allow teams to submit links</span></label></div><button type="submit" disabled={isLoading || !newContentItemTitle.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="h-4 w-4" /> Add Content Item</button></form></div>
            <div className="bg-white rounded-lg shadow-sm border"><div className="p-4 border-b"><h3 className="font-semibold text-gray-900">All Content Items & Submissions</h3></div><div className="p-4">{contentItems.length === 0 ? <div className="text-center py-8"><FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-500">No content items added yet</p></div> : <div className="space-y-4">{contentItems.map((item) => (<div key={item.id} className="border border-gray-200 rounded-lg"><div className="p-4 bg-gray-50 flex items-center justify-between"><button onClick={() => toggleContentItemExpansion(item.id)} className="flex items-center gap-3 flex-1 text-left">{expandedContentItems.has(item.id) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}<FileText className="h-5 w-5 text-purple-600" /><div><div className="font-medium text-gray-900">{item.title}</div><div className="text-xs text-gray-400 mt-1">{item.submissions.length} submissions • {item.allow_links ? 'Links allowed' : 'No links'} • {item.is_active ? 'Active' : 'Inactive'}</div></div></button><div className="flex items-center gap-2"><button onClick={() => toggleContentItemStatus(item.id, item.is_active)} className={`p-2 rounded transition-colors ${item.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`} title={item.is_active ? 'Deactivate' : 'Activate'}>{item.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</button><button onClick={() => deleteContentItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete content item"><Trash2 className="h-4 w-4" /></button></div></div>{expandedContentItems.has(item.id) && <div className="p-4 border-t border-gray-200">{item.submissions.length === 0 ? <p className="text-gray-500 text-sm">No submissions for this content item</p> : <div className="space-y-3">{TEAMS.map(team => { const teamSubmissions = item.submissions.filter(sub => sub.team_name === team); return ( <div key={team} className={`p-3 border rounded-lg ${teamSubmissions.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center justify-between mb-2"><span className={`font-medium text-sm px-2 py-1 rounded ${getTeamColor(team)}`}>Team {team}</span><div className="flex items-center gap-2"><span className={`text-xs font-medium px-2 py-1 rounded-full ${teamSubmissions.length > 0 ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{teamSubmissions.length} / 2 submitted</span>{teamSubmissions.length > 0 && <button onClick={() => resetTeamSubmissionsForContentItem(item.id, team)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors" title={`Reset all submissions for Team ${team}`}><RefreshCw className="h-4 w-4" /></button>}</div></div>{teamSubmissions.length > 0 ? <div className="space-y-3">{teamSubmissions.map((submission, index) => ( <div key={submission.id} className="p-2 bg-white rounded-md border border-gray-200 flex items-start justify-between"><div className="flex-1"><p className="font-medium text-sm text-gray-800"><span className="font-bold">#{index + 1}:</span> {submission.content_name}</p>{submission.content_description && <p className="text-xs text-gray-600 mt-1">{submission.content_description}</p>}{submission.content_link && <div className="flex items-center gap-1 mt-1"><Link className="h-3 w-3 text-blue-600" /><a href={submission.content_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate">{submission.content_link}</a></div>}<p className="text-xs text-gray-400 mt-1">Submitted: {new Date(submission.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p></div><button onClick={() => deleteSubmission(submission.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 ml-2" title="Delete this submission"><Trash2 className="h-4 w-4" /></button></div> ))}</div> : <p className="text-xs text-gray-500">No submissions from Team {team}</p>}</div> ); })}</div>}</div>}</div>))}</div>}</div></div>
          </div>
        )}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4"><h3 className="font-semibold text-gray-900 mb-3">Add New Item (Category)</h3><form onSubmit={addItem} className="flex items-center gap-3"><input type="text" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="New item title..." className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" disabled={isLoading} /><button type="submit" disabled={isLoading || !newItemTitle.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="h-4 w-4" /> Add Item</button></form></div>
            <div className="bg-white rounded-lg shadow-sm border p-4"><h3 className="font-semibold text-gray-900 mb-3">Add New Topic</h3><form onSubmit={addTopic} className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><select value={selectedItemIdForTopic} onChange={(e) => setSelectedItemIdForTopic(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" disabled={isLoading}><option value="">Select an item...</option>{items.map((item) => ( <option key={item.id} value={item.id}>{item.title}</option> ))}</select><input type="text" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} placeholder="Topic title..." className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" disabled={isLoading} /></div><button type="submit" disabled={isLoading || !newTopicTitle.trim() || !selectedItemIdForTopic} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="h-4 w-4" /> Add Topic</button></form></div>
            <div className="bg-white rounded-lg shadow-sm border"><div className="p-4 border-b"><h3 className="font-semibold text-gray-900">All Items & Topics</h3></div><div className="p-4">{items.length === 0 ? <div className="text-center py-8"><FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-500">No items added yet</p></div> : <div className="space-y-4">{items.map((item) => ( <div key={item.id} className="border border-gray-200 rounded-lg"><div className="p-4 bg-gray-50 flex items-center justify-between"><button onClick={() => toggleItemExpansion(item.id)} className="flex items-center gap-3 flex-1 text-left">{expandedItems.has(item.id) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}<ListChecks className="h-5 w-5 text-blue-600" /><div><div className="font-medium text-gray-900">{item.title}</div><div className="text-xs text-gray-400 mt-1">{item.topics.length} topics</div></div></button><button onClick={() => deleteItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete item"><Trash2 className="h-4 w-4" /></button></div>{expandedItems.has(item.id) && <div className="p-4 border-t border-gray-200">{item.topics.length === 0 ? <p className="text-gray-500 text-sm">No topics in this item</p> : <div className="space-y-2">{item.topics.map((topic) => ( <div key={topic.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"><div><p className="font-medium text-gray-800">{topic.title}</p>{topic.selected_by_team ? <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${getTeamColor(topic.selected_by_team)}`}>Selected by Team {topic.selected_by_team}</div> : <p className="text-xs text-green-600">Available</p>}</div><div className="flex items-center gap-2">{topic.selected_by_team && <button onClick={() => resetTopicSelection(topic.id)} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><RefreshCw className="h-4 w-4" /></button>}<button onClick={() => deleteTopic(topic.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button></div></div> ))}</div>}</div>}</div> ))}</div>}</div></div>
          </div>
        )}
        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4"><h3 className="font-semibold text-gray-900 mb-3">Team Credentials</h3><div className="space-y-4">{teamCredentials.map((cred) => ( <div key={cred.id} className="p-4 border rounded-lg"><h4 className="font-medium text-lg mb-2">Team {cred.team_name}</h4>{editingCredentials[cred.team_name] ? <div className="space-y-3"><input type="text" value={editingCredentials[cred.team_name].username} onChange={(e) => setEditingCredentials(prev => ({...prev, [cred.team_name]: {...prev[cred.team_name], username: e.target.value}}))} placeholder="Username" className="w-full px-3 py-2 border rounded-lg" /><input type="text" value={editingCredentials[cred.team_name].password} onChange={(e) => setEditingCredentials(prev => ({...prev, [cred.team_name]: {...prev[cred.team_name], password: e.target.value}}))} placeholder="Password" className="w-full px-3 py-2 border rounded-lg" /><div className="flex gap-2"><button onClick={() => updateTeamCredentials(cred.team_name, editingCredentials[cred.team_name].username, editingCredentials[cred.team_name].password)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button><button onClick={() => cancelEditingCredentials(cred.team_name)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button></div></div> : <div className="space-y-2"><p className="text-sm text-gray-600">Username: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cred.username || 'Not Set'}</span></p><div className="flex items-center gap-2"><p className="text-sm text-gray-600">Password: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{showPasswords[cred.team_name] ? cred.password : '••••••••' || 'Not Set'}</span></p><button onClick={() => setShowPasswords(p => ({...p, [cred.team_name]: !p[cred.team_name]}))} className="text-gray-500">{showPasswords[cred.team_name] ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div><button onClick={() => startEditingCredentials(cred.team_name, cred.username, cred.password)} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"><Edit className="h-3 w-3" /> Edit</button></div>}</div> ))}</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
