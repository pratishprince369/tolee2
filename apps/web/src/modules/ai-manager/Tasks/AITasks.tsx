'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAITasks, createAITask, updateAITaskStatus } from '@/actions/ai-manager';

export function AITasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const res = await getAITasks('all');
    if (res.success && res.tasks) {
      setTasks(res.tasks);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setLoading(true);
    const res = await createAITask({ title: newTaskTitle.trim() });
    if (res.success) {
      setNewTaskTitle('');
      loadTasks();
    }
    setLoading(false);
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateAITaskStatus(id, nextStatus);
    loadTasks();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-600" />
            AI Task & Reminder Manager
          </h2>
          <p className="text-xs text-slate-500">Manage daily, office, personal, and recurring voice tasks</p>
        </div>

        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <Input 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add new task (e.g., Pay electricity bill, Call client Rahul)..."
            className="rounded-full bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-sm"
          />
          <Button type="submit" disabled={loading} className="rounded-full bg-violet-600 hover:bg-violet-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Add Task
          </Button>
        </form>

        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl cursor-pointer hover:border-violet-300 transition-all"
                onClick={() => toggleTask(task.id, task.status)}
              >
                <div className="flex items-center gap-3">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-500">Category: {task.category}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No tasks added yet. Type a task or use voice commands!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
