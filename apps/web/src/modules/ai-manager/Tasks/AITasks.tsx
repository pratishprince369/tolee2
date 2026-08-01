'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Plus, Trash2, CheckCircle2, Circle, Clock, 
  Repeat, AlertTriangle, Archive, Calendar, BellRing, BellOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  getAITasks, 
  createAITask, 
  updateAITaskStatus, 
  getAIReminderHistory, 
  deleteAIReminder, 
  dismissAIReminder,
  dismissAllAIReminders 
} from '@/actions/ai-manager';
import { stopRingtoneAlarm } from '@/modules/ai-manager/Core/alarm-engine';

export function AITasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [turningOff, setTurningOff] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'recurring' | 'missed' | 'archived'>('pending');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    const [taskRes, remRes] = await Promise.all([
      getAITasks('all'),
      getAIReminderHistory(activeTab)
    ]);

    if (taskRes.success && taskRes.tasks) setTasks(taskRes.tasks);
    if (remRes.success && remRes.reminders) setReminders(remRes.reminders);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setLoading(true);
    const res = await createAITask({ title: newTaskTitle.trim() });
    if (res.success) {
      setNewTaskTitle('');
      loadData();
    }
    setLoading(false);
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateAITaskStatus(id, nextStatus);
    loadData();
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteAIReminder(id);
    loadData();
  };

  const handleCompleteReminder = async (id: string) => {
    await dismissAIReminder(id);
    loadData();
  };

  const handleTurnOffAllAlarms = async () => {
    setTurningOff(true);
    stopRingtoneAlarm(); // Immediately stop any active audio/speech
    await dismissAllAIReminders(); // Mark all active alarms as COMPLETED
    await loadData();
    setTurningOff(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* 1. Quick Task Form */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-600" />
            AI Task & Reminder Lifecycle Manager
          </h2>
          <p className="text-xs text-slate-500">Manage daily, office, personal, and recurring alarm reminders</p>
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

        {/* Task List */}
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.slice(0, 5).map((task) => (
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
                    <span className={`text-xs sm:text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">No pending tasks</p>
          )}
        </div>
      </div>

      {/* 2. Reminder History & Lifecycle Queue Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 flex-wrap gap-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-violet-600" /> REMINDER QUEUE & HISTORY
          </h3>

          {/* 🔕 TURN OFF ALL ALARMS BUTTON */}
          <Button
            type="button"
            size="sm"
            onClick={handleTurnOffAllAlarms}
            disabled={turningOff}
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20"
          >
            <BellOff className="w-3.5 h-3.5 mr-1.5" /> 
            {turningOff ? 'Turning Off...' : 'Turn Off All Alarms'}
          </Button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <Button
            size="sm"
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pending')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'pending' ? 'bg-violet-600 text-white' : ''}`}
          >
            <Clock className="w-3.5 h-3.5 mr-1" /> Upcoming ({reminders.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('completed')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'completed' ? 'bg-emerald-600 text-white' : ''}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'recurring' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('recurring')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'recurring' ? 'bg-blue-600 text-white' : ''}`}
          >
            <Repeat className="w-3.5 h-3.5 mr-1" /> Recurring
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'missed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('missed')}
            className={`rounded-full text-xs font-semibold ${activeTab === 'missed' ? 'bg-amber-600 text-white' : ''}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Missed
          </Button>
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          {reminders.length > 0 ? (
            reminders.map((r) => (
              <div 
                key={r.id} 
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 rounded-2xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {r.title}
                    </span>
                    {r.isRecurring && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold">
                        🔁 {r.recurrence || 'Recurring'}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'SNOOZED' ? 'bg-purple-100 text-purple-700' :
                      r.status === 'MISSED' ? 'bg-amber-100 text-amber-700' :
                      'bg-violet-100 text-violet-700'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(r.remindAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(r.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {r.timeZone && <span>({r.timeZone})</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {r.status !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCompleteReminder(r.id)}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteReminder(r.id)}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-6">
              No reminders in "{activeTab}" queue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
