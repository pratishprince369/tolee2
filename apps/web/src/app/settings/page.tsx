'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Shield, 
  Key, 
  User, 
  CreditCard, 
  Lock, 
  Mail, 
  Languages, 
  Activity, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Check
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  getUserSettings,
  updateAccountSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  changePassword,
  deleteUserAccount,
  logoutOtherSessions
} from '@/actions/user';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'security' | 'billing'>('account');
  
  // Settings values state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Field states
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English (US)');
  
  // Notification states
  const [notifPush, setNotifPush] = useState(true);
  const [notifChat, setNotifChat] = useState(true);
  const [notifGroup, setNotifGroup] = useState(true);
  const [notifMarket, setNotifMarket] = useState(true);
  const [notifShoot, setNotifShoot] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  
  // Privacy states
  const [isPrivate, setIsPrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [searchEngine, setSearchEngine] = useState(true);

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strength, setStrength] = useState({ score: 0, label: 'None', color: 'bg-zinc-200' });
  const [lastLoginIp, setLastLoginIp] = useState('127.0.0.1');
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [lastLoginDevice, setLastLoginDevice] = useState('Windows - Chrome');
  
  // Deletion Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  // Fetch initial preferences on mount/login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      getUserSettings().then((res) => {
        if (res.success && res.settings) {
          const s = res.settings;
          setEmail(s.email || '');
          setPreferredLanguage(s.preferredLanguage || 'English (US)');
          
          // Notifications
          setNotifPush(s.pushNotifications);
          setNotifChat(s.chatNotifications);
          setNotifGroup(s.groupNotifications);
          setNotifMarket(s.marketplaceNotifications);
          setNotifShoot(s.shootNotifications);
          setNotifEmail(s.emailNotifications);
          
          // Privacy
          setIsPrivate(s.isPrivate);
          setShowActivity(s.showActivityStatus);
          setSearchEngine(s.searchEngineIndexable);

          // Login activity
          setLastLoginIp(s.lastLoginIp || '182.72.102.50');
          setLastLoginAt(s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : new Date().toLocaleString());
          setLastLoginDevice(s.lastLoginDevice || 'Windows Desktop - Chrome Browser');
        }
        setIsLoading(false);
      });
    }
  }, [status, router]);

  // Show auto-dismiss toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Password strength checker logic
  const checkStrength = (pass: string) => {
    if (!pass) {
      setStrength({ score: 0, label: 'None', color: 'bg-zinc-200' });
      return;
    }
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) {
      setStrength({ score, label: 'Weak 🔴', color: 'bg-red-500 w-1/3' });
    } else if (score <= 4) {
      setStrength({ score, label: 'Medium 🟡', color: 'bg-amber-500 w-2/3' });
    } else {
      setStrength({ score, label: 'Strong 🟢', color: 'bg-emerald-500 w-full' });
    }
  };

  // Account Tab Saves
  const handleSaveAccount = async () => {
    setIsSubmitting(true);
    const res = await updateAccountSettings({ preferredLanguage });
    setIsSubmitting(false);
    if (res.success) {
      showToast('Account preferences updated successfully!', 'success');
    } else {
      showToast(res.error || 'Failed to update preferences.', 'error');
    }
  };

  // Notifications toggle auto-saves
  const toggleNotification = async (field: string, currentVal: boolean) => {
    const updatedVal = !currentVal;
    
    // Optimistic UI updates
    const payload = {
      pushNotifications: field === 'push' ? updatedVal : notifPush,
      chatNotifications: field === 'chat' ? updatedVal : notifChat,
      groupNotifications: field === 'group' ? updatedVal : notifGroup,
      marketplaceNotifications: field === 'market' ? updatedVal : notifMarket,
      shootNotifications: field === 'shoot' ? updatedVal : notifShoot,
      emailNotifications: field === 'email' ? updatedVal : notifEmail,
    };

    // Apply local state change
    if (field === 'push') setNotifPush(updatedVal);
    if (field === 'chat') setNotifChat(updatedVal);
    if (field === 'group') setNotifGroup(updatedVal);
    if (field === 'market') setNotifMarket(updatedVal);
    if (field === 'shoot') setNotifShoot(updatedVal);
    if (field === 'email') setNotifEmail(updatedVal);

    const res = await updateNotificationSettings(payload);
    if (res.success) {
      showToast('Notification settings auto-saved!', 'success');
    } else {
      showToast('Failed to save settings to server.', 'error');
      // Revert local state
      if (field === 'push') setNotifPush(currentVal);
      if (field === 'chat') setNotifChat(currentVal);
      if (field === 'group') setNotifGroup(currentVal);
      if (field === 'market') setNotifMarket(currentVal);
      if (field === 'shoot') setNotifShoot(currentVal);
      if (field === 'email') setNotifEmail(currentVal);
    }
  };

  // Privacy toggles auto-save
  const togglePrivacy = async (field: string, currentVal: boolean) => {
    const updatedVal = !currentVal;

    const payload = {
      isPrivate: field === 'private' ? updatedVal : isPrivate,
      showActivityStatus: field === 'activity' ? updatedVal : showActivity,
      searchEngineIndexable: field === 'search' ? updatedVal : searchEngine,
    };

    if (field === 'private') setIsPrivate(updatedVal);
    if (field === 'activity') setShowActivity(updatedVal);
    if (field === 'search') setSearchEngine(updatedVal);

    const res = await updatePrivacySettings(payload);
    if (res.success) {
      showToast('Privacy preferences updated!', 'success');
    } else {
      showToast('Failed to save privacy settings.', 'error');
      if (field === 'private') setIsPrivate(currentVal);
      if (field === 'activity') setShowActivity(currentVal);
      if (field === 'search') setSearchEngine(currentVal);
    }
  };

  // Password submission
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword({ currentPassword, newPassword });
    setIsSubmitting(false);

    if (res.success) {
      showToast('Your password was updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStrength({ score: 0, label: 'None', color: 'bg-zinc-200' });
    } else {
      showToast(res.error || 'Incorrect current password or update failed.', 'error');
    }
  };

  // Pruning other sessions
  const handlePruneSessions = async () => {
    setIsSubmitting(true);
    const res = await logoutOtherSessions();
    setIsSubmitting(false);
    if (res.success) {
      showToast('Other devices logged out successfully!', 'success');
    } else {
      showToast(res.error || 'Failed to clean other sessions.', 'error');
    }
  };

  // Triggering account deletion
  const handleDeleteAccountConfirm = async () => {
    if (!deleteConfirmPassword) {
      showToast('Password verification required.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await deleteUserAccount({ passwordConfirm: deleteConfirmPassword });
    
    if (res.success) {
      showToast('Your account was deleted successfully. Logging out...', 'success');
      setTimeout(async () => {
        setIsSubmitting(false);
        setIsDeleteModalOpen(false);
        await signOut({ callbackUrl: '/' });
      }, 2000);
    } else {
      setIsSubmitting(false);
      showToast(res.error || 'Incorrect verification credentials.', 'error');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-zinc-500 animate-pulse">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        
        {/* Banner Title */}
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">Settings & Privacy</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm sm:text-base">Manage your account preferences, notifications, security, and privacy.</p>
        </div>

        {/* ── Mobile: Sticky horizontal tab pills ── Desktop: sidebar + content ── */}
        <div className="flex flex-col md:flex-row gap-5 items-start">

          {/* Settings Navigation — horizontal scrollable pills on mobile, vertical sidebar on md+ */}
          <div className="w-full md:w-56 flex-shrink-0">
            {/* Sticky wrapper on mobile */}
            <div className="sticky top-0 z-20 md:static bg-background/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
              <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none"
                   style={{ WebkitOverflowScrolling: 'touch' }}>

                {/* Tab items */}
                {[
                  { id: 'account',       icon: <User className="w-4 h-4 flex-shrink-0" />,       label: 'Account' },
                  { id: 'notifications', icon: <Bell className="w-4 h-4 flex-shrink-0" />,       label: 'Notifications' },
                  { id: 'privacy',       icon: <Shield className="w-4 h-4 flex-shrink-0" />,     label: 'Privacy' },
                  { id: 'security',      icon: <Key className="w-4 h-4 flex-shrink-0" />,        label: 'Security' },
                  { id: 'billing',       icon: <CreditCard className="w-4 h-4 flex-shrink-0" />, label: 'Billing' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={[
                      // shared
                      'flex items-center gap-2 font-semibold text-sm transition-all duration-200 focus:outline-none',
                      // mobile: pill style, horizontal
                      'whitespace-nowrap px-4 py-2.5 rounded-full md:rounded-xl',
                      // desktop: full width row
                      'md:w-full md:px-4 md:py-2.5',
                      // active/inactive
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-white/60 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800/50',
                    ].join(' ')}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Content Panel */}
          <div className="flex-1 w-full space-y-6">
            
            {/* 1. ACCOUNT SETTINGS TAB */}
            {activeTab === 'account' && (
              <>
                <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl">
                  <CardHeader className="bg-primary/5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100">Account Information</CardTitle>
                    <CardDescription className="dark:text-zinc-400">Update your language preferences and view registered details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    
                    {/* Locked Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-semibold text-gray-800 dark:text-zinc-200">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                        <Input 
                          id="email" 
                          value={email} 
                          readOnly 
                          className="pl-10 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 cursor-not-allowed rounded-xl"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                        <Lock className="w-3.5 h-3.5" /> Email address cannot be changed at this time for verification stability.
                      </p>
                    </div>

                    {/* Language selector */}
                    <div className="space-y-2">
                      <Label htmlFor="language" className="font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-2">
                        <Languages className="w-4 h-4 text-zinc-500" /> Preferred Language
                      </Label>
                      <select 
                        id="language" 
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-medium text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary transition"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="Hindi (IN)">Hindi (IN)</option>
                      </select>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Select your platform language preference. Saved preferences load automatically.
                      </p>
                    </div>

                    <Button 
                      onClick={handleSaveAccount} 
                      disabled={isSubmitting}
                      className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto h-11 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200/50 dark:border-red-900/30 shadow-xl bg-red-50/40 dark:bg-red-950/5 backdrop-blur-md rounded-2xl overflow-hidden">
                  <CardHeader className="bg-red-500/5 border-b border-red-100 dark:border-red-900/10">
                    <CardTitle className="text-xl font-bold text-red-600 dark:text-red-500 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </CardTitle>
                    <CardDescription className="text-red-500/80 dark:text-red-400/80">Critical actions regarding your personal data and account state.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-700 dark:text-zinc-300 mb-5 leading-relaxed font-medium">
                      Deleting your account will immediately wipe your credentials, anonymize your postings (marked under "Deleted User"), terminate active device sessions, and suspend future logins. This process is irreversible.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="font-bold bg-red-600 hover:bg-red-700 text-white h-11 px-6 rounded-xl shadow-md transition-all"
                    >
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 2. NOTIFICATIONS SETTINGS TAB */}
            {activeTab === 'notifications' && (
              <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl">
                <CardHeader className="bg-[#042c42]/5 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100">Notification Preferences</CardTitle>
                  <CardDescription className="dark:text-zinc-400">Configure how and when you receive social notifications across devices.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  
                  {/* Push Switch */}
                  <div className="flex items-center justify-between pt-0 pb-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Push Notifications</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive flash alerts instantly in your browser or device notification drawer.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifPush 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifPush ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifPush} 
                        onCheckedChange={() => toggleNotification('push', notifPush)} 
                      />
                    </div>
                  </div>

                  {/* Chat Switch */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Chat & Messages</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Get notified when friends send you direct chat messages or promotions.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifChat 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifChat ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifChat} 
                        onCheckedChange={() => toggleNotification('chat', notifChat)} 
                      />
                    </div>
                  </div>

                  {/* Group Switch */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Group & Tolee Activities</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Alert me about new posts, rules adjustments, or members joining managed Tolees.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifGroup 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifGroup ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifGroup} 
                        onCheckedChange={() => toggleNotification('group', notifGroup)} 
                      />
                    </div>
                  </div>

                  {/* Marketplace Switch */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Marketplace Listings</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive alerts when local listings update or potential buyers contact you.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifMarket 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifMarket ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifMarket} 
                        onCheckedChange={() => toggleNotification('market', notifMarket)} 
                      />
                    </div>
                  </div>

                  {/* Shoot Switch */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Tolee Shoots</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Get notifications for targeted broad broadcast alerts (Shoots) in your zone.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifShoot 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifShoot ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifShoot} 
                        onCheckedChange={() => toggleNotification('shoot', notifShoot)} 
                      />
                    </div>
                  </div>

                  {/* Email Switch */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Email Newsletters</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Opt-in to periodic platform summaries, updates, and community activity digests.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        notifEmail 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {notifEmail ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={notifEmail} 
                        onCheckedChange={() => toggleNotification('email', notifEmail)} 
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* 3. PRIVACY & SAFETY SETTINGS TAB */}
            {activeTab === 'privacy' && (
              <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl">
                <CardHeader className="bg-[#042c42]/5 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100">Privacy & Safety</CardTitle>
                  <CardDescription className="dark:text-zinc-400">Govern who views your profile data, active status, and index listings.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  
                  {/* Private Account */}
                  <div className="flex items-center justify-between pt-0 pb-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">Private Account</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Only approved followers and mutual friends can view your timeline feed and profile details.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        isPrivate 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {isPrivate ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={isPrivate} 
                        onCheckedChange={() => togglePrivacy('private', isPrivate)} 
                      />
                    </div>
                  </div>

                  {/* Show Activity */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Show Activity Status</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Allow other users and members of mutual Tolees to see when you are active/online.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        showActivity 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {showActivity ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={showActivity} 
                        onCheckedChange={() => togglePrivacy('activity', showActivity)} 
                      />
                    </div>
                  </div>

                  {/* Search index indexable */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base font-semibold text-gray-900 dark:text-zinc-100">Search Engine Visibility</Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Allow search crawlers (Google, Bing) to index your Tolee profile and public listings.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        searchEngine 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}>
                        {searchEngine ? 'ON' : 'OFF'}
                      </span>
                      <Switch 
                        checked={searchEngine} 
                        onCheckedChange={() => togglePrivacy('search', searchEngine)} 
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* 4. PASSWORD & SECURITY TAB */}
            {activeTab === 'security' && (
              <>
                {/* Change Password Card */}
                <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl">
                  <CardHeader className="bg-primary/5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100">Change Password</CardTitle>
                    <CardDescription className="dark:text-zinc-400">Set a secure, strong password to safeguard your login details.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSavePassword} className="space-y-4">
                      
                      {/* Current password */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="currentPass" className="font-semibold text-zinc-700 dark:text-zinc-300">Current Password</Label>
                          <a 
                            href={`/auth/forgot-password?email=${encodeURIComponent(email)}`} 
                            className="text-xs text-primary dark:text-[#dbaf1c] font-semibold hover:underline"
                          >
                            Forgot Password?
                          </a>
                        </div>
                        <Input 
                          id="currentPass" 
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-11"
                        />
                      </div>

                      {/* New password */}
                      <div className="space-y-2">
                        <Label htmlFor="newPass" className="font-semibold text-zinc-700 dark:text-zinc-300">New Password</Label>
                        <Input 
                          id="newPass" 
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            checkStrength(e.target.value);
                          }}
                          placeholder="Minimum 8 characters"
                          className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-11"
                        />
                      </div>

                      {/* Strength indicator */}
                      {newPassword && (
                        <div className="space-y-1.5 mt-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/30">
                          <div className="flex justify-between items-center text-xs font-semibold text-zinc-500">
                            <span>Password Strength:</span>
                            <span className="font-bold">{strength.label}</span>
                          </div>
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${strength.color}`}></div>
                          </div>
                          <div className="text-[10px] text-zinc-400 grid grid-cols-2 gap-1 mt-1">
                            <span className={newPassword.length >= 8 ? 'text-emerald-500 font-semibold' : 'text-zinc-400'}>✓ Min 8 chars</span>
                            <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-500 font-semibold' : 'text-zinc-400'}>✓ Upper Case</span>
                            <span className={/[0-9]/.test(newPassword) ? 'text-emerald-500 font-semibold' : 'text-zinc-400'}>✓ Numbers</span>
                            <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-500 font-semibold' : 'text-zinc-400'}>✓ Special symbol</span>
                          </div>
                        </div>
                      )}

                      {/* Confirm new password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirmPass" className="font-semibold text-zinc-700 dark:text-zinc-300">Confirm New Password</Label>
                        <Input 
                          id="confirmPass" 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-11"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto h-11 px-6 rounded-xl mt-2 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                      </Button>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        Forgot your current password?{' '}
                        <a 
                          href={`/auth/forgot-password?email=${encodeURIComponent(email)}`} 
                          className="text-primary dark:text-[#dbaf1c] font-bold hover:underline"
                        >
                          Reset it via email OTP
                        </a>
                      </p>
                    </form>
                  </CardContent>
                </Card>

                {/* Login Activity Device List */}
                <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl">
                  <CardHeader className="bg-primary/5 border-b border-zinc-100 dark:border-zinc-800/50">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" /> Device Login Activity
                    </CardTitle>
                    <CardDescription className="dark:text-zinc-400">Track and prune your active device session logs securely.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    
                    <div className="space-y-4">
                      
                      {/* Active device log item */}
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-sm relative overflow-hidden">
                        <div className="absolute right-3 top-3 px-2 py-0.5 rounded bg-emerald-500 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Now
                        </div>
                        <Smartphone className="w-8 h-8 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-zinc-50">{lastLoginDevice}</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">IP Address: {lastLoginIp}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Logged In At: {lastLoginAt}</p>
                        </div>
                      </div>

                      {/* Mocked backup session (represents other device session standard) */}
                      <div className="flex items-start gap-4 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800/60 bg-white/30 dark:bg-zinc-950/20">
                        <Smartphone className="w-8 h-8 text-zinc-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-gray-800 dark:text-zinc-200">Apple iPhone 15 - Mobile Safari App</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">IP Address: 103.45.18.232</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Last Active: 2 hours ago</p>
                        </div>
                      </div>

                    </div>

                    <Button 
                      onClick={handlePruneSessions} 
                      disabled={isSubmitting}
                      className="font-bold bg-zinc-800 hover:bg-zinc-900 text-white w-full sm:w-auto h-11 px-6 rounded-xl flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Logout Other Devices'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 5. BILLING SETTINGS TAB */}
            {activeTab === 'billing' && (
              <Card className="border-white/40 dark:border-zinc-800/40 shadow-xl bg-white/80 dark:bg-[#121814]/90 backdrop-blur-md overflow-hidden rounded-2xl relative">
                
                {/* Coming Soon Overlay banner */}
                <div className="absolute inset-0 bg-white/30 dark:bg-black/35 backdrop-blur-xs flex flex-col items-center justify-center z-10 p-6 text-center">
                  <div className="bg-primary dark:bg-primary/95 text-primary-foreground px-5 py-2.5 rounded-full font-bold shadow-lg text-sm border border-white/25 flex items-center gap-2 animate-bounce">
                    🚀 Subscription Billing Coming Soon!
                  </div>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mt-3 max-w-xs">
                    We are currently building localized payments integration via Stripe & Razorpay.
                  </p>
                </div>

                <CardHeader className="bg-[#042c42]/5 border-b border-zinc-100 dark:border-zinc-800/50 filter blur-[1.5px]">
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-zinc-100">Subscription & Billing</CardTitle>
                  <CardDescription className="dark:text-zinc-400">View payment records and select creator billing plans.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 filter blur-[1.5px] select-none pointer-events-none">
                  
                  {/* Subscription card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#10b981] text-white space-y-3 shadow-md">
                    <h3 className="text-lg font-bold">Tolee Free Standard</h3>
                    <p className="text-xs text-white/80 leading-relaxed">Enjoy direct feed sharing, chat rooms, and joining public Tolees at zero cost.</p>
                    <div className="text-2xl font-black mt-2">₹ 0 <span className="text-xs font-normal">/ month</span></div>
                  </div>

                  {/* Table details placeholder */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Billing Records</h4>
                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-400">
                      No payment events recorded.
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* SUCCESS/ERROR TOAST DISPLAY */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 backdrop-blur-md' 
            : 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 backdrop-blur-md'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5.5 h-5.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <p className="text-sm font-bold leading-none">{toast.message}</p>
        </div>
      )}

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 space-y-4">
              
              <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">Permanently Delete Account?</h3>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                This is a secure action. To confirm the permanent deletion of account **{email}**, please verify your credentials.
              </p>

              {/* Password inputs */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="delPass" className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {email.includes('@') ? 'Enter password (or email to confirm):' : 'Enter password to confirm:'}
                </Label>
                <Input 
                  id="delPass" 
                  type="password"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  placeholder="Enter credential to confirm deletion"
                  className="rounded-xl border-zinc-200 dark:border-zinc-800 h-11 focus:ring-red-500"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmPassword('');
                }}
                disabled={isSubmitting}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 font-semibold h-11 px-5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteAccountConfirm}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-5 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Account'}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
