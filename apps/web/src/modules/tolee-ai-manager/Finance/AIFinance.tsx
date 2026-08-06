'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, CheckCircle2, Clock, Calendar, 
  CreditCard, ShieldAlert, Zap, Bell, Check, Edit2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAIMemories, saveAIMemory, deleteAIMemory } from '@/actions/ai-manager';

interface PaymentItem {
  id: string;
  title: string;
  amount: string;
  dueDate: string;
  category: 'emi' | 'rent' | 'insurance' | 'subscription' | 'utility' | 'other';
  status: 'pending' | 'paid';
}

export function AIFinance() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // New Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<'emi' | 'rent' | 'insurance' | 'subscription' | 'utility' | 'other'>('emi');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const res = await getAIMemories('finance');
    if (res.success && res.memories) {
      const items: PaymentItem[] = res.memories.map((m: any) => {
        try {
          const parsed = JSON.parse(m.value);
          return {
            id: m.id,
            title: m.key,
            amount: parsed.amount || '0',
            dueDate: parsed.dueDate || 'Today',
            category: parsed.category || 'other',
            status: parsed.status || 'pending'
          };
        } catch {
          return {
            id: m.id,
            title: m.key,
            amount: m.value,
            dueDate: 'Upcoming',
            category: 'other',
            status: 'pending'
          };
        }
      });
      setPayments(items);
    }
    setLoading(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = JSON.stringify({
      amount: amount.trim() ? `₹${amount.trim().replace(/^₹/, '')}` : '₹0',
      dueDate: dueDate || 'Due Soon',
      category,
      status: 'pending'
    });

    await saveAIMemory({
      category: 'finance',
      key: title.trim(),
      value: payload
    });

    setTitle('');
    setAmount('');
    setDueDate('');
    setShowAddModal(false);
    loadPayments();
  };

  const toggleMarkPaid = async (item: PaymentItem) => {
    const nextStatus = item.status === 'paid' ? 'pending' : 'paid';
    const payload = JSON.stringify({
      amount: item.amount,
      dueDate: item.dueDate,
      category: item.category,
      status: nextStatus
    });

    await saveAIMemory({
      category: 'finance',
      key: item.title,
      value: payload
    });

    loadPayments();
  };

  const handleDelete = async (id: string) => {
    await deleteAIMemory(id);
    loadPayments();
  };

  const filteredPayments = payments.filter(p => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'pending') return p.status === 'pending';
    if (filterCategory === 'paid') return p.status === 'paid';
    return p.category === filterCategory;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Pending Payments & Finance Manager
            </h2>
            <p className="text-xs text-slate-500">Track EMI, Rent, Utility Bills, Insurance & Subscriptions</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            size="sm" 
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Payment Reminder
          </Button>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 text-xs">
          {['all', 'pending', 'paid', 'emi', 'rent', 'insurance', 'subscription', 'utility'].map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={filterCategory === cat ? 'default' : 'ghost'}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-full text-xs capitalize font-semibold ${filterCategory === cat ? 'bg-emerald-600 text-white' : ''}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Add Payment Form Modal / Inline Card */}
      {showAddModal && (
        <form onSubmit={handleAddPayment} className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Add Payment Reminder
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Title (e.g. Car Insurance EMI, Electricity Bill)" 
              required
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="Amount (e.g. ₹4,500)" 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <Input 
              type="date"
              value={dueDate} 
              onChange={e => setDueDate(e.target.value)} 
              className="bg-white dark:bg-zinc-800 rounded-xl"
            />
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="emi">EMI</option>
              <option value="rent">Rent</option>
              <option value="insurance">Insurance</option>
              <option value="subscription">Subscription</option>
              <option value="utility">Utility Bill</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-600 text-white rounded-xl">Save Payment</Button>
          </div>
        </form>
      )}

      {/* Payment List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl flex-wrap gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${item.status === 'paid' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {item.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Due: {item.dueDate}</span>
                    <span>•</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{item.amount}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  onClick={() => toggleMarkPaid(item)}
                  className={`rounded-full text-xs font-bold ${item.status === 'paid' ? 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {item.status === 'paid' ? 'Paid' : 'Mark Paid'}
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
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full w-fit mx-auto">
              <DollarSign className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No pending payments yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Add your EMI, Rent, Insurance, or Utility bill reminders to get automated alerts from Tolee AI.</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Payment Reminder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
