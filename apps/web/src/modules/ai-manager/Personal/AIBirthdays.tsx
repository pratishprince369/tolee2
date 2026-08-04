'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cake, Plus, Send, Bell, Gift, Calendar, Heart, 
  UserPlus, Check, Trash2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory } from '@/actions/ai-manager';

interface BirthdayItem {
  id: string;
  name: string;
  relation: string;
  date: string;
  phone?: string;
  type: 'birthday' | 'anniversary';
}

export function AIBirthdays() {
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [date, setDate] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'birthday' | 'anniversary'>('birthday');

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    setLoading(true);
    const res = await getAIMemories('family');
    if (res.success && res.memories) {
      const items: BirthdayItem[] = res.memories.map((m: any) => {
        try {
          const parsed = JSON.parse(m.value);
          return {
            id: m.id,
            name: m.key,
            relation: parsed.relation || 'Friend',
            date: parsed.date || 'Today',
            phone: parsed.phone || '',
            type: parsed.type || 'birthday'
          };
        } catch {
          return {
            id: m.id,
            name: m.key,
            relation: 'Friend',
            date: m.value,
            phone: '',
            type: 'birthday'
          };
        }
      });
      setBirthdays(items);
    }
    setLoading(false);
  };

  const handleAddBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = JSON.stringify({
      relation: relation.trim() || 'Friend / Family',
      date: date || 'Today',
      phone: phone.trim(),
      type
    });

    await saveAIMemory({
      category: 'family',
      key: name.trim(),
      value: payload
    });

    setName('');
    setRelation('');
    setDate('');
    setPhone('');
    setShowAddModal(false);
    loadBirthdays();
  };

  const handleDelete = async (id: string) => {
    await deleteAIMemory(id);
    loadBirthdays();
  };

  const handleSendWish = (item: BirthdayItem) => {
    const text = item.type === 'anniversary'
      ? `Happy Anniversary ${item.name}! 🎉 Wishing you love, laughter, and a wonderful day ahead!`
      : `Happy Birthday ${item.name}! 🎂 Wish you a fantastic year filled with success and happiness!`;
    const targetPhone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    const url = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredItems = birthdays.filter(b => {
    if (filterType === 'all') return true;
    if (filterType === 'birthday') return b.type === 'birthday';
    if (filterType === 'anniversary') return b.type === 'anniversary';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cake className="w-5 h-5 text-pink-600" />
              Birthdays & Anniversaries Manager
            </h2>
            <p className="text-xs text-slate-500">Auto-reminders, WhatsApp wish generator & automated greetings</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            size="sm" 
            className="rounded-full bg-pink-600 hover:bg-pink-700 text-white font-bold"
          >
            <UserPlus className="w-4 h-4 mr-1" /> Add Birthday / Contact
          </Button>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 pt-2 text-xs">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilterType('all')}
            className={`rounded-full text-xs font-semibold ${filterType === 'all' ? 'bg-pink-600 text-white' : ''}`}
          >
            All Greetings ({birthdays.length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'birthday' ? 'default' : 'ghost'}
            onClick={() => setFilterType('birthday')}
            className={`rounded-full text-xs font-semibold ${filterType === 'birthday' ? 'bg-pink-600 text-white' : ''}`}
          >
            <Cake className="w-3.5 h-3.5 mr-1" /> Birthdays
          </Button>
          <Button
            size="sm"
            variant={filterType === 'anniversary' ? 'default' : 'ghost'}
            onClick={() => setFilterType('anniversary')}
            className={`rounded-full text-xs font-semibold ${filterType === 'anniversary' ? 'bg-purple-600 text-white' : ''}`}
          >
            <Heart className="w-3.5 h-3.5 mr-1" /> Anniversaries
          </Button>
        </div>
      </div>

      {/* Add Modal Form */}
      {showAddModal && (
        <form onSubmit={handleAddBirthday} className="bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <Gift className="w-4 h-4" /> Add Birthday / Anniversary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Name (e.g. Rahul Sharma, Priya)" 
              required
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={relation} 
              onChange={e => setRelation(e.target.value)} 
              placeholder="Relationship (e.g. Friend, Wife, Client)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              type="date"
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="Phone (optional, for WhatsApp wishes)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white md:col-span-2"
            >
              <option value="birthday">Birthday 🎂</option>
              <option value="anniversary">Anniversary 🎉</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-pink-600 text-white rounded-xl">Save Greeting</Button>
          </div>
        </form>
      )}

      {/* Birthday / Anniversary List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl flex-wrap gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.type === 'anniversary' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600' : 'bg-pink-100 dark:bg-pink-950/60 text-pink-600'}`}>
                  {item.type === 'anniversary' ? <Heart className="w-5 h-5" /> : <Cake className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                      {item.relation}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>📅 {item.date}</span>
                    {item.phone && <span>• 📞 {item.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  onClick={() => handleSendWish(item)}
                  className="rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Send Wishes
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="p-4 bg-pink-50 dark:bg-pink-950/40 text-pink-600 rounded-full w-fit mx-auto">
              <Cake className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No birthdays today</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Keep track of your family, friends, and client birthdays with one-click WhatsApp wishes.</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-full font-bold text-xs"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Add Birthday / Contact
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
