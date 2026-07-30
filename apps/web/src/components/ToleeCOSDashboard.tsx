'use client';

import React, { useState } from 'react';
import { getToleeTypeConfig } from '@/modules/tolee-types/registry';
import { 
  Building2, Briefcase, TrendingUp, PartyPopper, GraduationCap, 
  School, ShoppingCart, Landmark, HeartHandshake, Factory, 
  ClipboardList, Stethoscope, Home, Utensils, Sun, Users, 
  ShieldCheck, Receipt, Sparkles, CheckCircle2, Clock, 
  MessageSquare, Calendar, FileText, QrCode, Vote, Bell, 
  BookOpen, Award, Bus, MessageCircle, Printer, Package, 
  Map, Gift, Wrench, FileCheck, Lock, Shield, Grid, 
  Navigation, ChefHat, Heart, Video
} from 'lucide-react';

interface ToleeCOSDashboardProps {
  tolee: {
    id: string;
    name: string;
    category?: string | null;
    slug?: string | null;
    isPrivate?: boolean;
  };
  userRole?: string | null;
}

const ICON_MAP: Record<string, any> = {
  Building2, Briefcase, TrendingUp, PartyPopper, GraduationCap,
  School, ShoppingCart, Landmark, HeartHandshake, Factory,
  ClipboardList, Stethoscope, Home, Utensils, Sun, Users,
  ShieldCheck, Receipt, Sparkles, CheckCircle2, Clock,
  MessageSquare, Calendar, FileText, QrCode, Vote, Bell,
  BookOpen, Award, Bus, MessageCircle, Printer, Package,
  Map, Gift, Wrench, FileCheck, Lock, Shield, Grid,
  Navigation, ChefHat, Heart, Video
};

export function ToleeCOSDashboard({ tolee, userRole }: ToleeCOSDashboardProps) {
  const config = getToleeTypeConfig(tolee.category);
  const IconComponent = ICON_MAP[config.icon] || Users;

  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'features' | 'ai'>('overview');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponses, setAiResponses] = useState<{ query: string; response: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAskAI = (promptText?: string) => {
    const q = promptText || aiQuery;
    if (!q.trim() || isAiLoading) return;

    setIsAiLoading(true);
    setTimeout(() => {
      let mockRes = `[${config.aiAssistant.name}]: Here is how I can assist with "${q}": Based on ${config.title} guidelines, all items have been updated in your Tolee dashboard.`;
      if (q.toLowerCase().includes('notice') || q.toLowerCase().includes('agm')) {
        mockRes = `📢 **Notice Drafted for ${tolee.name}**\n\nDear Members,\nThis is to notify all members regarding the upcoming general meeting. Please join the discussion thread on Tolee.\n\nRegards,\nManagement`;
      } else if (q.toLowerCase().includes('complaint') || q.toLowerCase().includes('maintenance')) {
        mockRes = `🛠️ **Ticket Logged**: Maintenance request logged for ${tolee.name}. The in-charge team member has been notified.`;
      }

      setAiResponses((prev) => [{ query: q, response: mockRes }, ...prev]);
      setAiQuery('');
      setIsAiLoading(false);
    }, 800);
  };

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md">
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">{config.title}</h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {config.categoryTag} COS
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            Capacity: {config.estimatedMembers}
          </span>
        </div>
      </div>

      {/* COS Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Overview & Tools
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Roles & Governance ({config.roles.length})
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'features'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Active Modules ({config.features.length})
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
              : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {config.aiAssistant.name}
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {config.features.map((feat) => {
            const FeatureIcon = ICON_MAP[feat.iconName] || CheckCircle2;
            return (
              <div
                key={feat.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <FeatureIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{feat.name}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">{feat.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: Roles */}
      {activeTab === 'roles' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500">Configured Member Roles for {config.title}:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.roles.map((role) => (
              <div key={role.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{role.name}</span>
                    {role.isDefault && (
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded font-bold">Default</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                </div>
                <div className="text-right">
                  {role.canManageSettings && <span className="text-[10px] block text-indigo-500 font-bold">Admin</span>}
                  {role.canManagePayments && <span className="text-[10px] block text-green-500 font-bold">Finance</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Features */}
      {activeTab === 'features' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500">Industry Features Enabled for {tolee.name}:</div>
          <div className="space-y-2">
            {config.features.map((feat) => {
              const FeatureIcon = ICON_MAP[feat.iconName] || CheckCircle2;
              return (
                <div key={feat.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FeatureIcon className="w-4 h-4 text-indigo-500" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">{feat.name}</h4>
                      <p className="text-[11px] text-gray-500">{feat.description}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    Active Module
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI Assistant */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">{config.aiAssistant.name}</h4>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">{config.aiAssistant.roleDescription}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.aiAssistant.suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleAskAI(p)}
                className="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                💡 {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder={`Ask ${config.aiAssistant.name}...`}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={isAiLoading || !aiQuery.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isAiLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>

          {aiResponses.length > 0 && (
            <div className="space-y-3 pt-2 max-h-60 overflow-y-auto">
              {aiResponses.map((res, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-1 text-xs">
                  <div className="font-bold text-gray-900 dark:text-white">Q: {res.query}</div>
                  <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{res.response}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
