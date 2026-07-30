'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Brain, Trash2, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory } from '@/actions/ai-manager';

export function AIMemorySettings() {
  const [memories, setMemories] = useState<any[]>([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    const res = await getAIMemories();
    if (res.success) {
      setMemories(res.memories);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !value) return;
    setLoading(true);
    await saveAIMemory({ category: 'personal', key, value });
    setKey('');
    setValue('');
    loadMemories();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteAIMemory(id);
    loadMemories();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            AI Conversation Memory & Privacy Controls
          </h2>
          <p className="text-xs text-slate-500">Manage what your AI Personal Manager remembers about your schedule, preferences, and important dates</p>
        </div>

        <form onSubmit={handleSave} className="p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Add New Memory</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input 
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Memory Key (e.g. wife_birthday, car_insurance_due)"
              className="bg-white dark:bg-zinc-900 text-sm"
            />
            <Input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value (e.g. 15th October, Expires 20th August)"
              className="bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <Button type="submit" disabled={loading} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Save Memory
          </Button>
        </form>

        <div className="space-y-2">
          {memories.length > 0 ? (
            memories.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-violet-600 uppercase">{m.key}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.value}</p>
                </div>
                <Button onClick={() => handleDelete(m.id)} variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-400 py-4">No custom memories saved yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
