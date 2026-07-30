'use client';

import React, { useState } from 'react';
import { 
  Settings, Globe, Lock, Shield, Users, UserCheck, AlertTriangle, 
  Trash2, QrCode, Share2, Bell, Sparkles, MessageSquare, Check, 
  Info, Eye, EyeOff, FileText, CheckCircle2, ChevronRight, Sliders,
  DollarSign, Activity, Zap, Radio, Crown, AlertCircle, Save, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateGroupSettings, transferToleeOwnership, deleteTolee, updateMemberRole, sendEmergencyGroupBroadcast } from '@/actions/tolee';
import { TOLEE_TYPE_REGISTRY } from '@/modules/tolee-types/registry';

interface ToleeGroupSettingsProps {
  tolee: any;
  currentUserId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export function ToleeGroupSettings({ tolee, currentUserId, isOwner = false, isAdmin = false }: ToleeGroupSettingsProps) {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [name, setName] = useState(tolee.name || '');
  const [description, setDescription] = useState(tolee.description || '');
  const [category, setCategory] = useState(tolee.category || 'general');
  const [isPrivate, setIsPrivate] = useState<boolean>(tolee.isPrivate || false);
  const [isSearchable, setIsSearchable] = useState<boolean>(tolee.isPublicVisible !== false);
  const [rules, setRules] = useState(tolee.rules || '');
  const [questions, setQuestions] = useState(tolee.membershipQuestions || '');
  const [welcomeMessage, setWelcomeMessage] = useState(tolee.welcomeMessage || '');
  const [pendingPostApproval, setPendingPostApproval] = useState<boolean>(tolee.pendingPostApproval || false);
  const [coverImage, setCoverImage] = useState(tolee.coverImage || '');
  const [avatar, setAvatar] = useState(tolee.avatar || '');

  // Emergency Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // Danger Zone State
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Transfer Ownership State
  const [newOwnerUserId, setNewOwnerUserId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);

  // AI Group Manager State
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiAutoWelcome, setAiAutoWelcome] = useState(true);

  // Feature Toggles State
  const [features, setFeatures] = useState<Record<string, boolean>>({
    announcements: true,
    events: true,
    marketplace: true,
    jobs: true,
    attendance: true,
    visitor_register: true,
    complaint_desk: true,
    task_manager: true,
    document_vault: true,
    emergency_sos: true,
    crm: true
  });

  const typeConfig = TOLEE_TYPE_REGISTRY[tolee.category || 'general'] || TOLEE_TYPE_REGISTRY.general;

  const handleSaveGeneral = async () => {
    setSaving(true);
    setSaveSuccess(false);
    const res = await updateGroupSettings(tolee.id, {
      name,
      description,
      category,
      isPrivate,
      isSearchable,
      rules,
      membershipQuestions: questions,
      welcomeMessage,
      pendingPostApproval,
      coverImage,
      avatar
    });
    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert(`Failed to save settings: ${res.error}`);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    setBroadcastResult(null);
    const res = await sendEmergencyGroupBroadcast(tolee.id, broadcastMsg);
    setBroadcasting(false);
    if (res.success) {
      setBroadcastResult(`Broadcast sent successfully to ${res.count} members!`);
      setBroadcastMsg('');
    } else {
      setBroadcastResult(`Broadcast failed: ${res.error}`);
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE in capital letters to confirm.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteTolee(tolee.id, deleteConfirmation);
    setDeleting(false);
    if (res.success) {
      window.location.href = '/discover?deleted=true';
    } else {
      setDeleteError(res.error || 'Failed to delete group');
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerUserId.trim()) return;
    setTransferring(true);
    setTransferResult(null);
    const res = await transferToleeOwnership(tolee.id, newOwnerUserId);
    setTransferring(false);
    if (res.success) {
      setTransferResult('Group ownership transferred successfully! Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setTransferResult(`Transfer failed: ${res.error}`);
    }
  };

  const navItems = [
    { id: 'general', label: 'General Settings', icon: Sliders },
    { id: 'privacy', label: 'Privacy & Discovery', icon: Lock },
    { id: 'members', label: 'Members & Approvals', icon: Users },
    { id: 'permissions', label: 'Member Permissions', icon: Shield },
    { id: 'roles', label: 'Roles & Governance', icon: Crown },
    { id: 'moderation', label: 'AI Content Moderation', icon: CheckCircle2 },
    { id: 'rules', label: 'Group Rules', icon: FileText },
    { id: 'features', label: 'Modules & Features Toggle', icon: Zap },
    { id: 'chat', label: 'Chat & Broadcast', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics & Insights', icon: Activity },
    { id: 'badges', label: 'Member Badges', icon: Crown },
    { id: 'ai', label: 'AI Group Manager', icon: Sparkles },
    { id: 'monetization', label: 'Monetization & Wallet', icon: DollarSign },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, danger: true }
  ];

  return (
    <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden min-h-[650px] flex flex-col md:flex-row">
      {/* LEFT SIDE NAVIGATION */}
      <div className="w-full md:w-64 bg-gray-50/50 dark:bg-gray-900/40 border-r border-gray-200 dark:border-gray-800 p-3 space-y-1 flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-200/60 dark:border-gray-800 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white">Group Settings</h3>
          </div>
          {isOwner && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Founder
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                isActive
                  ? item.danger
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : item.danger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>

      {/* RIGHT CONTENT PANEL */}
      <div className="flex-1 p-6 overflow-y-auto">
        {saveSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Settings updated successfully!
          </div>
        )}

        {/* 1. GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">General Information</h2>
              <p className="text-xs text-gray-500 mt-1">Update basic group details visible to all members and visitors.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  placeholder="Group Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Group Category & COS Type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white"
                >
                  {Object.values(TOLEE_TYPE_REGISTRY).map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.categoryTag})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs resize-y"
                  placeholder="Describe your group..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Welcome Message for New Members</label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs resize-y"
                  placeholder="Greeting message sent to approved members..."
                />
              </div>

              <div className="pt-3">
                <Button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold px-6"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PRIVACY & DISCOVERY */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Privacy & Searchability</h2>
              <p className="text-xs text-gray-500 mt-1">Control who can join your group and find it in Search & Explore map.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Group Access Level</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setIsPrivate(false)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      !isPrivate
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-600/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-xs text-gray-900 dark:text-white">Public</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Anyone can see who's in the group and what they post.</p>
                  </div>

                  <div
                    onClick={() => setIsPrivate(true)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isPrivate
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-gray-900 dark:text-white">Private</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Only approved members can see group posts and member list.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Search & Map Discovery</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSearchable(true)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      isSearchable ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> Visible in Search & Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSearchable(false)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      !isSearchable ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <EyeOff className="w-4 h-4" /> Hidden / Secret Group
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold px-6"
              >
                Save Privacy Settings
              </Button>
            </div>
          </div>
        )}

        {/* 3. MEMBERS & APPROVALS */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Members & Approval Settings</h2>
              <p className="text-xs text-gray-500 mt-1">Configure membership screening and approval questions.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Membership Questions (One per line)</label>
                <textarea
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs resize-y"
                  placeholder="e.g. Which flat number do you own?&#10;What is your mobile number?"
                />
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Require Post Approval</h4>
                  <p className="text-[11px] text-gray-500">Admins must review and approve posts before they appear in feed.</p>
                </div>
                <input
                  type="checkbox"
                  checked={pendingPostApproval}
                  onChange={(e) => setPendingPostApproval(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
              </div>

              <Button onClick={handleSaveGeneral} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold px-6">
                Save Approval Settings
              </Button>
            </div>
          </div>
        )}

        {/* 4. PERMISSIONS MATRIX */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Member Permissions Matrix</h2>
              <p className="text-xs text-gray-500 mt-1">Grant or restrict actions for regular group members.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {[
                { label: 'Create Posts & Share Media', defaultChecked: true },
                { label: 'Comment on Group Posts', defaultChecked: true },
                { label: 'Create Polls & Surveys', defaultChecked: true },
                { label: 'Start Live Broadcasts', defaultChecked: false },
                { label: 'Create Marketplace Listings', defaultChecked: true },
                { label: 'Post Announcements', defaultChecked: false },
                { label: 'Invite New Members', defaultChecked: true },
                { label: 'Upload Documents & PDFs', defaultChecked: true }
              ].map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{p.label}</span>
                  <input type="checkbox" defaultChecked={p.defaultChecked} className="w-4 h-4 rounded text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. ROLES & GOVERNANCE */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Roles & Governance Structure ({typeConfig.title})</h2>
              <p className="text-xs text-gray-500 mt-1">Specialized organizational roles tailored for {typeConfig.title}.</p>
            </div>

            <div className="space-y-2 max-w-xl">
              {typeConfig.roles.map((r) => (
                <div key={r.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{r.name}</span>
                      {r.isDefault && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">Default Role</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{r.description}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Configure</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. AI CONTENT MODERATION */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">AI Content Moderation Panel</h2>
              <p className="text-xs text-gray-500 mt-1">Automatic AI filtering for spam, profanity, and toxicity.</p>
            </div>

            <div className="space-y-3 max-w-xl">
              {[
                { title: 'AI Profanity Filter', desc: 'Auto-mask offensive words in comments and posts', active: true },
                { title: 'Spam & Link Protection', desc: 'Flag suspicious external links and repeated spam messages', active: true },
                { title: 'AI Toxicity Detection', desc: 'Auto-hide toxic or hate speech comments', active: true },
                { title: 'Duplicate Post Shield', desc: 'Prevent members from posting duplicate content within 24h', active: false }
              ].map((mod, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{mod.title}</h4>
                    <p className="text-[11px] text-gray-500">{mod.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked={mod.active} className="w-4 h-4 rounded text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. GROUP RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Group Guidelines & Rules</h2>
              <p className="text-xs text-gray-500 mt-1">Set rules members must agree to before posting or joining.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Group Rules (One per line)</label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={6}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs resize-y"
                  placeholder="1. Be kind and respectful&#10;2. No spam or self-promotion&#10;3. Respect member privacy"
                />
              </div>

              <Button onClick={handleSaveGeneral} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold px-6">
                Save Rules
              </Button>
            </div>
          </div>
        )}

        {/* 8. MODULES & FEATURES TOGGLE */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Active COS Business Modules</h2>
              <p className="text-xs text-gray-500 mt-1">Enable or disable specialized workspace modules for this group.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {typeConfig.features.map((f) => (
                <div key={f.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{f.name}</h4>
                    <p className="text-[10px] text-gray-500">{f.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked={f.enabledByDefault} className="w-4 h-4 rounded text-indigo-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. CHAT & BROADCAST */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Chat & Emergency Broadcast</h2>
              <p className="text-xs text-gray-500 mt-1">Broadcast high-priority emergency notifications to all group members.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Admin Emergency Broadcast</h4>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-400">
                  Sends an immediate system notification alert to every member of {tolee.name}.
                </p>

                <textarea
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-gray-900 text-xs resize-y"
                  placeholder="Type urgent announcement or emergency alert..."
                />

                {broadcastResult && (
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{broadcastResult}</p>
                )}

                <Button
                  onClick={handleBroadcast}
                  disabled={broadcasting || !broadcastMsg.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold px-5"
                >
                  {broadcasting ? 'Broadcasting...' : 'Send Emergency Broadcast 🚨'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 10. ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Group Analytics & Growth</h2>
              <p className="text-xs text-gray-500 mt-1">Monitor member engagement and growth metrics.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-xl">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-500/20 text-center">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{tolee.membersCount || tolee._count?.members || 1}</span>
                <p className="text-[11px] font-bold text-gray-500 mt-1">Total Members</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20 text-center">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">94%</span>
                <p className="text-[11px] font-bold text-gray-500 mt-1">Active Retention</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-500/20 text-center">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">4.8 / 5</span>
                <p className="text-[11px] font-bold text-gray-500 mt-1">Health Score</p>
              </div>
            </div>
          </div>
        )}

        {/* 11. BADGES */}
        {activeTab === 'badges' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Member Badges & Recognition</h2>
              <p className="text-xs text-gray-500 mt-1">Badges automatically displayed next to member names across Tolee.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xl">
              {[
                { title: '👑 Founder', desc: 'Group Creator & Super Admin' },
                { title: '🛡 Super Admin', desc: 'Full System Governance' },
                { title: '⭐ Moderator', desc: 'Content Reviewer' },
                { title: '🔥 Top Contributor', desc: 'Active posting award' },
                { title: '🌟 Rising Star', desc: 'New active member' },
                { title: '💎 VIP Member', desc: 'Premium subscriber' }
              ].map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">{b.title}</h4>
                  <p className="text-[10px] text-gray-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 12. AI GROUP MANAGER */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">AI Group Manager ({typeConfig.aiAssistant.name})</h2>
              <p className="text-xs text-gray-500 mt-1">Configure your group's custom AI Assistant.</p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 max-w-xl space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">{typeConfig.aiAssistant.name}</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">{typeConfig.aiAssistant.roleDescription}</p>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Custom System Instructions</label>
                <textarea
                  value={aiSystemPrompt || typeConfig.aiAssistant.systemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs resize-y"
                />
              </div>

              <Button onClick={handleSaveGeneral} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold px-6">
                Save AI Configuration
              </Button>
            </div>
          </div>
        )}

        {/* 13. MONETIZATION */}
        {activeTab === 'monetization' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Monetization & Wallet</h2>
              <p className="text-xs text-gray-500 mt-1">Set up paid memberships, donations, and event tickets.</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 max-w-xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Paid Group Memberships (Coming Soon)</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Collect monthly or annual membership dues automatically via UPI/Cards.</p>
            </div>
          </div>
        )}

        {/* 14. DANGER ZONE (FOUNDER ONLY) */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h2>
              <p className="text-xs text-gray-500 mt-1">Actions in this panel are permanent and cannot be undone.</p>
            </div>

            <div className="space-y-6 max-w-xl">
              {/* Transfer Ownership */}
              <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">👑 Transfer Group Ownership</h3>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Transfer Founder & Super Admin ownership to another member. You will become an Admin.
                </p>

                {isOwner ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter new owner User ID..."
                      value={newOwnerUserId}
                      onChange={(e) => setNewOwnerUserId(e.target.value)}
                      className="rounded-xl bg-white dark:bg-gray-900"
                    />
                    {transferResult && <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{transferResult}</p>}
                    <Button
                      onClick={handleTransferOwnership}
                      disabled={transferring || !newOwnerUserId.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold px-5"
                    >
                      {transferring ? 'Transferring...' : 'Transfer Ownership'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 italic">Only the Founder can transfer ownership.</p>
                )}
              </div>

              {/* Permanent Delete Group */}
              <div className="p-5 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 space-y-3">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300">🗑 Permanent Group Deletion</h3>
                <p className="text-xs text-red-800 dark:text-red-400">
                  Permanently delete {tolee.name}, removing all posts, group chats, member rosters, and metadata. This action is **IRREVERSIBLE**.
                </p>

                {isOwner ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Type <span className="text-red-600 uppercase font-black">DELETE</span> to confirm:
                    </p>
                    <Input
                      placeholder="Type DELETE"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="rounded-xl bg-white dark:bg-gray-900 border-red-300"
                    />
                    {deleteError && <p className="text-xs font-bold text-red-600">{deleteError}</p>}
                    <Button
                      onClick={handleDeleteGroup}
                      disabled={deleting || deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold px-6"
                    >
                      {deleting ? 'Deleting Group...' : 'Permanently Delete Group'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-red-700 italic">Only the Founder can permanently delete this group.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
