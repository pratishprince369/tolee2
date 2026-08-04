'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, MapPin, Users, Video, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory } from '@/actions/ai-manager';

interface MeetingItem {
  id: string;
  title: string;
  time: string;
  date: string;
  location?: string;
  attendees?: string;
  status: 'today' | 'upcoming' | 'past';
}

export function AICalendar() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'past' | 'all'>('today');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    const res = await getAIMemories('calendar');
    if (res.success && res.memories) {
      const items: MeetingItem[] = res.memories.map((m: any) => {
        try {
          const parsed = JSON.parse(m.value);
          return {
            id: m.id,
            title: m.key,
            time: parsed.time || '10:00 AM',
            date: parsed.date || 'Today',
            location: parsed.location || 'Google Meet / Online',
            attendees: parsed.attendees || 'Tolee Group Members',
            status: parsed.status || 'today'
          };
        } catch {
          return {
            id: m.id,
            title: m.key,
            time: '10:00 AM',
            date: 'Today',
            location: m.value,
            attendees: 'Tolee Members',
            status: 'today'
          };
        }
      });
      setMeetings(items);
    }
    setLoading(false);
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = JSON.stringify({
      time: time || '10:00 AM',
      date: date || 'Today',
      location: location || 'Tolee Live Stage',
      attendees: 'Team',
      status: 'upcoming'
    });

    await saveAIMemory({
      category: 'calendar',
      key: title.trim(),
      value: payload
    });

    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setShowAddForm(false);
    loadMeetings();
  };

  const handleDelete = async (id: string) => {
    await deleteAIMemory(id);
    loadMeetings();
  };

  const filteredMeetings = meetings.filter(m => {
    if (activeTab === 'all') return true;
    return m.status === activeTab;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-600" />
              Scheduled Meetings & Calendar
            </h2>
            <p className="text-xs text-slate-500">Auto-synced with Tolee Groups, Live Stage & Personal Calendar</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            size="sm" 
            className="rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Meeting
          </Button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-2 text-xs">
          <Button
            size="sm"
            variant={activeTab === 'today' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('today')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'today' ? 'bg-violet-600 text-white' : ''}`}
          >
            Today's Meetings
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('upcoming')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'upcoming' ? 'bg-violet-600 text-white' : ''}`}
          >
            Upcoming
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'past' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('past')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'past' ? 'bg-violet-600 text-white' : ''}`}
          >
            Past Meetings
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('all')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'all' ? 'bg-violet-600 text-white' : ''}`}
          >
            All ({meetings.length})
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddMeeting} className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <Video className="w-4 h-4" /> Schedule New Meeting
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Meeting Title (e.g. Project Review, Client Sync)" 
              required
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              type="date"
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              type="time"
              value={time} 
              onChange={e => setTime(e.target.value)} 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
              placeholder="Location / Link (e.g. Google Meet, Tolee Live Stage)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-violet-600 text-white rounded-xl">Save Meeting</Button>
          </div>
        </form>
      )}

      {/* Meetings List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
        {filteredMeetings.length > 0 ? (
          filteredMeetings.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl flex-wrap gap-3">
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-violet-600" />
                  {m.title}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-3">
                  <span>📅 {m.date}</span>
                  <span>⏰ {m.time}</span>
                  <span>📍 {m.location}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)} className="text-xs text-rose-500 hover:bg-rose-50">
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="p-4 bg-violet-50 dark:bg-violet-950/40 text-violet-600 rounded-full w-fit mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No scheduled meetings yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Schedule team syncs, client calls, or masterclasses with automatic calendar integration.</p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Meeting
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
