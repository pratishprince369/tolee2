'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { updateUserLocation, updateNotificationSettings, syncContacts, toggleFollow } from '@/actions/user';
import { 
  Bell, MapPin, Users, Image as ImageIcon, CheckCircle, 
  Smartphone, ArrowRight, ShieldCheck, HelpCircle, 
  X, Loader2, Sparkles, Volume2, ShieldAlert
} from 'lucide-react';

interface PermissionStep {
  id: 'notifications' | 'location' | 'contacts' | 'gallery' | 'battery';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  accentColor: string;
}

export function PushNotificationManager() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const initializedRef = useRef(false);
  const tokenSyncRef = useRef(false);

  // Permission Flow UI States
  const [isNative, setIsNative] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  
  // Suggested users matched from contacts
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Track individual permission statuses
  const [permissionStates, setPermissionStates] = useState<Record<string, 'prompt' | 'granted' | 'denied'>>({
    notifications: 'prompt',
    location: 'prompt',
    contacts: 'prompt',
    gallery: 'prompt',
    battery: 'prompt'
  });

  const steps: PermissionStep[] = [
    {
      id: 'notifications',
      title: 'Enable Push Notifications',
      subtitle: 'Stay connected in real-time',
      description: 'Get instant alerts for private messages, group mentions, marketplace inquiries, follow requests, comments, and post likes just like WhatsApp.',
      icon: <Bell className="w-8 h-8 text-indigo-400" />,
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-950/30',
      accentColor: 'text-indigo-400'
    },
    {
      id: 'location',
      title: 'Local Discovery & City Feed',
      subtitle: 'Connect with your neighborhood',
      description: 'Discover nearby Tolee groups, local marketplace listings, city-specific reels, and receive localized notifications in your region.',
      icon: <MapPin className="w-8 h-8 text-emerald-400" />,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-950/30',
      accentColor: 'text-emerald-400'
    },
    {
      id: 'contacts',
      title: 'Find Friends & Sync Contacts',
      subtitle: 'Expand your social network',
      description: 'Securely sync your contacts list to instantly find friends already sharing moments on Tolee and invite others to join your groups.',
      icon: <Users className="w-8 h-8 text-amber-400" />,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-950/30',
      accentColor: 'text-amber-400'
    },
    {
      id: 'gallery',
      title: 'Access Photos & Videos',
      subtitle: 'Share your creative stories',
      description: 'Required to upload posts, record stories/reels, post items on the local marketplace, and set a customized profile avatar.',
      icon: <ImageIcon className="w-8 h-8 text-rose-400" />,
      color: 'from-rose-500 to-pink-600',
      bgColor: 'bg-rose-950/30',
      accentColor: 'text-rose-400'
    },
    {
      id: 'battery',
      title: 'Disable Battery Optimization',
      subtitle: 'Ensure instant delivery',
      description: 'Let Tolee run unrestricted in the background so that messages, likes, and comments are delivered to you immediately without delay.',
      icon: <ShieldCheck className="w-8 h-8 text-sky-400" />,
      color: 'from-sky-500 to-blue-600',
      bgColor: 'bg-sky-950/30',
      accentColor: 'text-sky-400'
    }
  ];

  // 1. Initial Permission Check on Native Startup
  // Checks BOTH the local preference cache AND the actual native OS-level permission state.
  // If the OS notifications state is still 'prompt' (not asked yet), we ALWAYS force show the modal!
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNativePlatform = Capacitor.isNativePlatform();

        if (isNativePlatform) {
          setIsNative(true);
          await checkAndPromptPermissions();
        } else {
          setIsNative(false);
        }
      } catch (err) {
        console.error('[PermissionsManager] Platform check failed:', err);
        setIsNative(false);
      }
    };

    const checkAndPromptPermissions = async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        // Query the actual native OS permission state directly
        const notifStatus = await PushNotifications.checkPermissions();
        const { value: onboarded } = await Preferences.get({ key: 'tolee_permissions_onboarded' });
        
        const { value: locPerm } = await Preferences.get({ key: 'tolee_permission_location' });
        const { value: contPerm } = await Preferences.get({ key: 'tolee_permission_contacts' });
        const { value: gallPerm } = await Preferences.get({ key: 'tolee_permission_gallery' });
        const { value: batPerm } = await Preferences.get({ key: 'tolee_permission_battery' });

        const parsedState = notifStatus.receive === 'granted' ? 'granted' : notifStatus.receive === 'denied' ? 'denied' : 'prompt';
        
        let isBatteryIgnored = false;
        if (typeof window !== 'undefined' && (window as any).AndroidBridge?.isBatteryOptimizationIgnored) {
          isBatteryIgnored = (window as any).AndroidBridge.isBatteryOptimizationIgnored();
        }

        setPermissionStates({
          notifications: parsedState as any,
          location: (locPerm || 'prompt') as any,
          contacts: (contPerm || 'prompt') as any,
          gallery: (gallPerm || 'prompt') as any,
          battery: (isBatteryIgnored ? 'granted' : (batPerm || 'prompt')) as any
        });

        // If native OS hasn't asked yet (prompt), or user hasn't completed flow, open the pre-prompt modal!
        if (notifStatus.receive === 'prompt' || onboarded !== 'true') {
          setShowModal(true);
        } else {
          // Already onboarded, activate FCM directly
          setupPushNotificationsDirectly();
        }
      } catch (err) {
        console.error('[PermissionsManager] Initialization check failed:', err);
      }
    };

    checkPlatform();
  }, []);

  // 1.5. Define global onFCMTokenReceived callback for native bridge integration
  useEffect(() => {
    const handleToken = async (token: string) => {
      console.log('[PushNotificationManager] FCM Token received:', token);
      if (!token) return;

      try {
        const response = await fetch('/api/user/save-push-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, deviceType: 'android' }),
        });
        const data = await response.json();
        console.log('[PushNotificationManager] FCM Token save response:', data);
      } catch (err) {
        console.error('[PushNotificationManager] FCM Token save error:', err);
      }
    };

    (window as any).onFCMTokenReceived = handleToken;
    (window as any).onFCMTokenRefresh = handleToken;

    // Trigger getFCMToken on Android bridge to request the token!
    try {
      if (typeof window !== 'undefined') {
        const bridge = (window as any).AndroidBridge || (window as any).ToleeNative;
        if (bridge && typeof bridge.getFCMToken === 'function') {
          console.log('[PushNotificationManager] Triggering getFCMToken on Android native bridge');
          bridge.getFCMToken();
        }
      }
    } catch (e) {
      console.error('[PushNotificationManager] Failed to trigger getFCMToken:', e);
    }

    return () => {
      delete (window as any).onFCMTokenReceived;
      delete (window as any).onFCMTokenRefresh;
    };
  }, [session]);

  // 2. Automatically refresh and sync push token on every successful login!
  // This guarantees that if a user reinstalls the app or switches accounts, the backend
  // database is instantly updated with the correct, active FCM push token!
  useEffect(() => {
    if (!session?.user) return;
    
    const syncTokenOnLogin = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');
        const status = await PushNotifications.checkPermissions();
        
        if (status.receive === 'granted') {
          tokenSyncRef.current = true;
          await activateFcmPipeline(PushNotifications);
          console.log('[PushNotificationManager] Syncing and refreshing FCM push token on session login...');
          
          try {
            await updateNotificationSettings({
              pushNotifications: true,
              chatNotifications: true,
              groupNotifications: true,
              marketplaceNotifications: true,
              shootNotifications: true,
              emailNotifications: true
            });
          } catch (dbErr) {
            console.error('[PushNotificationManager] Failed to auto-enable DB notification settings on login:', dbErr);
          }
        }
      } catch (e) {
        console.log('[PushNotificationManager] Sync token on login failed:', e);
      }
    };

    syncTokenOnLogin();
  }, [session]);

  // Setup push notifications straight without prompt if already accepted
  const setupPushNotificationsDirectly = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      if (status.receive === 'granted') {
        await activateFcmPipeline(PushNotifications);
      }
    } catch (e) {
      console.log('[PushNotificationManager] Setup failed:', e);
    }
  };

  // 3. App resume listener to re-verify permissions when returning from settings
  useEffect(() => {
    let appListener: any = null;
    
    const setupResumeListener = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        
        // @ts-ignore
        const { App } = await import('@capacitor/app');
        appListener = await App.addListener('appStateChange', async (state: any) => {
          if (state.isActive) {
            console.log('[PushNotificationManager] App resumed. Re-checking permissions...');
            await checkAndSyncPermissionsOnResume();
          }
        });
      } catch (e) {
        console.error('[PushNotificationManager] Resume listener error:', e);
      }
    };
    
    setupResumeListener();
    
    return () => {
      if (appListener) {
        appListener.then((h: any) => h.remove());
      }
    };
  }, [session]);

  const checkAndSyncPermissionsOnResume = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      
      const parsedState = status.receive === 'granted' ? 'granted' : status.receive === 'denied' ? 'denied' : 'prompt';
      setPermissionStates(prev => ({
        ...prev,
        notifications: parsedState as any
      }));

      if (status.receive === 'granted') {
        console.log('[FCM] Notification permission granted on resume. Activating FCM pipeline.');
        await activateFcmPipeline(PushNotifications);
        
        // Advance currentStep to 1 (Location) if they are currently on Step 0 (Notifications)
        setCurrentStep(prev => {
          if (prev === 0) {
            return 1;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('[PushNotificationManager] Sync on resume failed:', e);
    }
  };

  // Full FCM Token and Channels pipeline activation
  const activateFcmPipeline = async (PushNotifications: any) => {
    try {
      type ChannelDef = {
        id: string;
        name: string;
        description: string;
        importance: number;
        sound?: string;
        vibration?: boolean;
        visibility?: number;
      };

      const channels: ChannelDef[] = [
        {
          id: 'messages',
          name: 'Direct Messages',
          description: 'Instant direct messages from other users',
          importance: 5, // Max Importance: Forces Heads-Up Slide-Down Banners and Vibration
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'groups',
          name: 'Group Chats',
          description: 'New updates and chat messages inside Tolee groups',
          importance: 5, // Max Importance: Heads-Up Alerting
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'social',
          name: 'Social Activity',
          description: 'Alerts when people like, comment, repost or follow you',
          importance: 5, // Max Importance: slide-down banner
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'marketplace',
          name: 'Marketplace Deals',
          description: 'New offers, product inquiries, and regional listing alerts',
          importance: 5, // Max Importance
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'promotions',
          name: 'Promotions & Shoots',
          description: 'Sponsored updates, exclusive coupons, and special broadcasts',
          importance: 4, // High importance
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'default',
          name: 'General Alerts',
          description: 'General system notifications and updates from Tolee',
          importance: 5,
          sound: 'default',
          vibration: true,
          visibility: 1
        }
      ];

      // Delete old channels first so Android forces a fresh recreation with Max Importance
      for (const channel of channels) {
        try {
          await PushNotifications.deleteChannel({ id: channel.id });
        } catch (_) {}
      }

      // Re-create high importance channels
      for (const channel of channels) {
        try {
          await PushNotifications.createChannel(channel);
        } catch (_) {}
      }

      await PushNotifications.register();

      // FCM Token registrations listener
      await PushNotifications.addListener('registration', async (token: any) => {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: 'tolee_push_token', value: token.value });

          // Send to backend immediately if logged in
          if (session?.user) {
            await fetch('/api/user/save-push-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ token: token.value, deviceType: 'android' }),
            });
            console.log('[FCM] Token saved on server successfully');
          }
        } catch (err) {
          console.error('[PushNotificationManager] Save token failed:', err);
        }
      });

      // Foreground handler
      await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('[FCM] Received in foreground:', notification);
      });

      // Deep link tap action handler
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        const data = action.notification.data;
        if (data?.url) {
          router.push(data.url);
        }
      });
    } catch (err) {
      console.error('[FCM] Pipeline activation error:', err);
    }
  };

  // Execute actual runtime permission step-by-step requests
  const handleRequestPermission = async () => {
    const activeStep = steps[currentStep];
    const { Preferences } = await import('@capacitor/preferences');

    try {
      if (activeStep.id === 'notifications') {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        if (permissionStates.notifications === 'denied') {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge?.openAppSettings) {
            (window as any).AndroidBridge.openAppSettings();
          } else {
            alert('Please enable notifications in your device settings.');
          }
          return;
        }

        const res = await PushNotifications.requestPermissions();
        const parsedState = res.receive === 'granted' ? 'granted' : res.receive === 'denied' ? 'denied' : 'prompt';
        setPermissionStates(prev => ({ ...prev, notifications: parsedState as any }));
        await Preferences.set({ key: 'tolee_permission_notifications', value: res.receive });

        if (res.receive === 'granted') {
          await activateFcmPipeline(PushNotifications);
          
          if (session?.user) {
            try {
              await updateNotificationSettings({
                pushNotifications: true,
                chatNotifications: true,
                groupNotifications: true,
                marketplaceNotifications: true,
                shootNotifications: true,
                emailNotifications: true
              });
            } catch (dbErr) {
              console.error('Failed to auto-enable DB notification preferences:', dbErr);
            }
          }
          advanceStep();
        }
      } 
      
      else if (activeStep.id === 'location') {
        const { Geolocation } = await import('@capacitor/geolocation');

        if (permissionStates.location === 'denied') {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge?.openAppSettings) {
            (window as any).AndroidBridge.openAppSettings();
          } else {
            alert('Please enable location access in your device settings.');
          }
          return;
        }

        const res = await Geolocation.requestPermissions({ permissions: ['location'] });
        const granted = res.location === 'granted' || (res as any).coarseLocation === 'granted';
        setPermissionStates(prev => ({ ...prev, location: granted ? 'granted' : 'denied' }));
        await Preferences.set({ key: 'tolee_permission_location', value: granted ? 'granted' : 'denied' });

        if (granted) {
          try {
            const pos = await Geolocation.getCurrentPosition();
            if (pos?.coords) {
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              
              // Smooth reverse-geocoding to fetch city & neighborhood
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
              if (response.ok) {
                const geoData = await response.json();
                const address = geoData.address || {};
                const city = address.city || address.town || address.village || address.state || 'My City';
                const neighborhood = address.suburb || address.neighbourhood || '';
                
                if (session?.user) {
                  await updateUserLocation(city, neighborhood);
                }
              }
            }
          } catch (locErr) {
            console.error('Failed to resolve city geocode:', locErr);
          }
          advanceStep();
        }
      } 
      
      else if (activeStep.id === 'gallery') {
        const { Camera } = await import('@capacitor/camera');

        if (permissionStates.gallery === 'denied') {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge?.openAppSettings) {
            (window as any).AndroidBridge.openAppSettings();
          } else {
            alert('Please enable photos/camera access in your device settings.');
          }
          return;
        }

        const res = await Camera.requestPermissions({ permissions: ['photos', 'camera'] });
        const granted = res.photos === 'granted' || res.camera === 'granted';
        setPermissionStates(prev => ({ ...prev, gallery: granted ? 'granted' : 'denied' }));
        await Preferences.set({ key: 'tolee_permission_gallery', value: granted ? 'granted' : 'denied' });

        if (granted) {
          advanceStep();
        }
      } 
      
      else if (activeStep.id === 'contacts') {
        if (permissionStates.contacts === 'denied') {
          if (typeof window !== 'undefined' && (window as any).AndroidBridge?.openAppSettings) {
            (window as any).AndroidBridge.openAppSettings();
          } else {
            alert('Please enable contacts access in your device settings.');
          }
          return;
        }

        // Call native bridge if available
        if (typeof window !== 'undefined' && (window as any).AndroidBridge?.requestContactsPermission) {
          (window as any).onContactsPermissionResult = (granted: boolean) => {
            handleContactsPermissionResult(granted);
          };
          (window as any).AndroidBridge.requestContactsPermission();
        } else {
          // Fallback to simulated contacts sync directly (e.g. on web/development)
          handleContactsPermissionResult(true);
        }
      }

      else if (activeStep.id === 'battery') {
        if (typeof window !== 'undefined' && (window as any).AndroidBridge?.requestIgnoreBatteryOptimizations) {
          (window as any).AndroidBridge.requestIgnoreBatteryOptimizations();
          // Advance step after short delay to let intent launch
          setTimeout(() => {
            advanceStep();
          }, 1500);
        } else {
          // Web fallback
          advanceStep();
        }
      }
    } catch (err) {
      console.error(`Permission step ${activeStep.id} failed:`, err);
      advanceStep();
    }
  };

  const handleFollowUser = async (userId: string) => {
    const isCurrentlyFollowing = followingMap[userId];
    if (isCurrentlyFollowing) {
      const user = suggestedUsers.find(u => u.id === userId);
      const displayName = user ? (user.name || user.username) : 'this user';
      const confirmUnfollow = window.confirm(`Unfollow ${displayName}?`);
      if (!confirmUnfollow) return;
    }

    try {
      // Optimistic UI update
      setFollowingMap(prev => ({
        ...prev,
        [userId]: !isCurrentlyFollowing
      }));

      const res = await toggleFollow(userId);
      if (!res.success) {
        // Revert if failed
        setFollowingMap(prev => ({
          ...prev,
          [userId]: isCurrentlyFollowing
        }));
        alert(res.error || 'Failed to toggle follow status');
      } else {
        setFollowingMap(prev => ({
          ...prev,
          [userId]: res.isFollowing || false
        }));
      }
    } catch (err) {
      console.error('Failed to follow user:', err);
      // Revert if failed
      setFollowingMap(prev => ({
        ...prev,
        [userId]: isCurrentlyFollowing
      }));
    }
  };

  const handleContactsPermissionResult = async (granted: boolean) => {
    const { Preferences } = await import('@capacitor/preferences');
    
    setPermissionStates(prev => ({ ...prev, contacts: granted ? 'granted' : 'denied' }));
    await Preferences.set({ key: 'tolee_permission_contacts', value: granted ? 'granted' : 'denied' });

    if (granted) {
      setIsSyncing(true);
      setSyncProgress(10);
      
      let contactsArray: { name: string; phone: string }[] = [];
      if (typeof window !== 'undefined' && (window as any).AndroidBridge?.getContacts) {
        try {
          const rawContacts = (window as any).AndroidBridge.getContacts();
          if (rawContacts) {
            contactsArray = JSON.parse(rawContacts);
          }
        } catch (err) {
          console.error('Failed to parse native contacts:', err);
        }
      }

      setSyncProgress(40);

      let matched: any[] = [];
      if (contactsArray.length > 0) {
        try {
          const phones = contactsArray.map(c => c.phone).filter(Boolean);
          const syncRes = await syncContacts(phones);
          if (syncRes.success && syncRes.users) {
            matched = syncRes.users;
          }
        } catch (err) {
          console.error('Failed to match contacts on backend:', err);
        }
      }

      setSyncProgress(70);

      setTimeout(() => {
        setSyncProgress(100);
        setIsSyncing(false);
        setSuggestedUsers(matched);
        
        // Initialize following map
        const initialMap: Record<string, boolean> = {};
        matched.forEach(u => {
          initialMap[u.id] = u.isFollowing;
        });
        setFollowingMap(initialMap);

        if (matched.length > 0) {
          setSyncResult(`Found ${matched.length} contact(s) on Tolee! 🎉`);
        } else {
          setSyncResult('No contacts found on Tolee yet. Invite your friends!');
        }
      }, 500);
    } else {
      advanceStep();
    }
  };

  const handleSkipStep = async () => {
    const activeStep = steps[currentStep];
    const { Preferences } = await import('@capacitor/preferences');
    
    setPermissionStates(prev => ({ ...prev, [activeStep.id]: 'denied' }));
    await Preferences.set({ key: `tolee_permission_${activeStep.id}`, value: 'denied' });
    
    advanceStep();
  };

  const advanceStep = () => {
    setSyncResult(null);
    setSyncProgress(0);
    setIsSyncing(false);

    const nextIndex = currentStep + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      // If next step is battery optimization, and it's already whitelisted natively, complete flow!
      if (nextStep.id === 'battery') {
        let isBatteryIgnored = false;
        if (typeof window !== 'undefined' && (window as any).AndroidBridge?.isBatteryOptimizationIgnored) {
          isBatteryIgnored = (window as any).AndroidBridge.isBatteryOptimizationIgnored();
        }
        if (isBatteryIgnored) {
          completeOnboarding();
          return;
        }
      }
      setCurrentStep(nextIndex);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'tolee_permissions_onboarded', value: 'true' });
    setShowModal(false);
  };

  if (!isNative || !showModal) return null;

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-md select-none animate-in fade-in duration-350">
      
      {/* Sleek Glassmorphic Card Overlay */}
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
        
        {/* Abstract Glowing Ring */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-tr ${activeStep.color} opacity-20 blur-3xl`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-tr ${activeStep.color} opacity-10 blur-3xl`} />

        {/* Small Close Button */}
        <button 
          onClick={completeOnboarding}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-800/40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dynamic Big Icon */}
        <div className={`w-20 h-20 rounded-3xl ${activeStep.bgColor} border border-slate-800 flex items-center justify-center mb-6 relative shadow-inner animate-pulse`}>
          {activeStep.icon}
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-tr ${activeStep.color} opacity-5 blur-xs`} />
        </div>

        {/* Headings */}
        <div className="space-y-1.5 mb-5 z-10">
          <p className={`text-xs font-black uppercase tracking-widest ${activeStep.accentColor}`}>
            Step {currentStep + 1} of 5 · Permission
          </p>
          <h2 className="text-xl font-black text-white leading-tight">
            {activeStep.title}
          </h2>
          <p className="text-sm font-extrabold text-slate-400">
            {activeStep.subtitle}
          </p>
        </div>

        {/* Interactive Contacts Sync Section */}
        {activeStep.id === 'contacts' && (isSyncing || syncResult) ? (
          <div className="w-full bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4.5 mb-6 z-10 flex flex-col items-center justify-center max-h-60 overflow-y-auto">
            {isSyncing ? (
              <div className="space-y-3 w-full">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    Syncing contacts safely...
                  </span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-xs font-bold text-slate-200">{syncResult}</p>
                </div>
                
                {suggestedUsers.length > 0 && (
                  <div className="w-full space-y-2 mt-1 max-h-36 overflow-y-auto pr-1">
                    {suggestedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/30">
                        <div className="flex items-center gap-2 text-left">
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-full object-cover border border-slate-700" 
                          />
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1">
                              {user.name}
                              {user.isVerified && (
                                <span className="inline-flex w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] items-center justify-center font-bold text-white">✓</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">@{user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowUser(user.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                            followingMap[user.id] 
                              ? 'bg-slate-700 text-slate-300' 
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                          }`}
                        >
                          {followingMap[user.id] ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={advanceStep}
                  className="mt-1 w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Context Description Box */
          <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-4.5 text-xs text-slate-400 leading-relaxed mb-6 text-left max-w-sm select-text z-10 w-full">
            {activeStep.description}
          </div>
        )}

        {/* Steps Dot Progress bar */}
        <div className="flex gap-2 mb-6 select-none z-10">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep 
                  ? `w-6 bg-gradient-to-r ${activeStep.color}` 
                  : idx < currentStep 
                    ? 'w-2 bg-slate-600' 
                    : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions Row */}
        {!(activeStep.id === 'contacts' && (isSyncing || syncResult)) && (
          <div className="flex items-center gap-3 w-full z-10">
            <button
              onClick={handleSkipStep}
              className="flex-1 h-12 rounded-2xl font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-slate-800 transition-all text-sm"
            >
              Not Now
            </button>
            <button
              onClick={handleRequestPermission}
              className={`flex-1 h-12 rounded-2xl font-black text-white bg-gradient-to-tr ${activeStep.color} shadow-lg shadow-indigo-950/40 hover:shadow-xl hover:brightness-105 active:scale-97 transition-all text-sm flex items-center justify-center gap-1.5`}
            >
              Allow
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
