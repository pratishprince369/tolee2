export const dynamic = "force-dynamic";
import { getNotifications, markNotificationsAsRead, getPendingFollowRequests, respondToFollowRequest } from '@/actions/user';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Heart, MessageCircle, UserPlus, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { PendingFollowRequests } from '@/components/PendingFollowRequests';
import { ReferralNotificationActions } from '@/components/ReferralNotificationActions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

  const [res, pendingRes, userProfile] = await Promise.all([
    getNotifications(),
    getPendingFollowRequests(),
    currentUserId ? prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, username: true }
    }) : Promise.resolve(null)
  ]);
  
  const referralCode = userProfile?.username || userProfile?.id || '';
  const notifications = res.success ? res.notifications : [];
  const pendingRequests = pendingRes.success ? pendingRes.requests : [];
  
  // Mark all as read when visiting the page
  if (notifications.some((n: any) => !n.isRead)) {
    await markNotificationsAsRead();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pt-24 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Notifications</h1>
          <p className="text-gray-500">Stay updated on your activity</p>
        </div>
      </div>

      <PendingFollowRequests initialRequests={pendingRequests} respondAction={respondToFollowRequest} />

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-gray-800">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p>When someone interacts with your posts, it will show up here.</p>
          </div>
        ) : (
          notifications.map((notification: any) => {
            let Icon = Bell;
            let iconColor = 'text-gray-500';
            let bgColor = 'bg-gray-100 dark:bg-gray-800';

            if (notification.type === 'like') {
              Icon = Heart;
              iconColor = 'text-red-500';
              bgColor = 'bg-red-50 dark:bg-red-900/20';
            } else if (notification.type === 'comment') {
              Icon = MessageCircle;
              iconColor = 'text-blue-500';
              bgColor = 'bg-blue-50 dark:bg-blue-900/20';
            } else if (notification.type === 'follow') {
              Icon = UserPlus;
              iconColor = 'text-green-500';
              bgColor = 'bg-green-50 dark:bg-green-900/20';
            }

            if (notification.type === 'referral_invite') {
              return (
                <Card key={notification.id} className="border-indigo-500/20 dark:border-indigo-500/10 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-zinc-950 dark:to-zinc-950 hover:from-indigo-50/60 dark:hover:from-indigo-950/30 transition-all rounded-2xl mb-6 shadow-sm relative overflow-hidden group">
                  <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-indigo-100/80 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl animate-pulse">
                      🎉
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div>
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg">
                          🎉 Earn ₹500 in Your Ads Wallet!
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed max-w-xl">
                        {notification.message}
                      </p>
                      
                      {/* Copy & Share Buttons client actions */}
                      <ReferralNotificationActions referralCode={referralCode} />
                    </div>
                    {!notification.isRead && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            if (notification.type === 'referral_joined') {
              return (
                <Card key={notification.id} className="border-emerald-500/20 dark:border-emerald-500/10 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-zinc-950 dark:to-zinc-950 hover:from-emerald-50/60 dark:hover:from-emerald-950/30 transition-all rounded-2xl mb-6 shadow-sm relative overflow-hidden group">
                  <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-100/80 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-extrabold text-2xl">
                      🤝
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div>
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg">
                          🎉 Congratulations! New Referral Joined
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed max-w-xl">
                        {notification.message}
                      </p>
                      
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <Link 
                          href="/ads-manager?tab=wallet" 
                          className="inline-flex items-center gap-1.5 bg-[#00ba88] hover:bg-[#009e74] text-white text-xs font-black rounded-xl px-4 py-2.5 shadow-sm transition-all"
                        >
                          <span>View Ads Wallet</span>
                        </Link>
                        <Link 
                          href="/ads-manager?tab=overview" 
                          className="inline-flex items-center gap-1.5 bg-gray-150 hover:bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white text-xs font-black rounded-xl px-4 py-2.5 shadow-sm transition-all"
                        >
                          <span>View Referral History</span>
                        </Link>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            if (notification.type === 'welcome' || notification.type === 'welcome_reminder') {
              const cardTitle = notification.type === 'welcome' ? 'Welcome to Tolee! 🎉' : "You're almost ready! 🚀";
              return (
                <Link key={notification.id} href={notification.link || '/discover'}>
                  <Card className="border-teal-500/20 dark:border-teal-500/10 bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-zinc-950 dark:to-zinc-950 hover:from-teal-50/60 dark:hover:from-teal-950/30 transition-all rounded-2xl mb-6 shadow-sm relative overflow-hidden group">
                    <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-teal-100/80 dark:bg-teal-950 text-teal-600 dark:text-teal-400 font-extrabold text-2xl">
                        {notification.type === 'welcome' ? '🎉' : '🚀'}
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <div>
                          <h3 className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg">
                            {cardTitle}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed max-w-xl">
                          {notification.message}
                        </p>
                        <div className="pt-1.5 flex items-center">
                          <span className="inline-flex items-center gap-1.5 bg-[#0a7c85] hover:bg-[#086971] text-white text-xs font-black rounded-xl px-4 py-2.5 shadow-sm transition-all group-hover:translate-x-0.5">
                            <span>Join Groups</span>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            }

            if (notification.type.startsWith('radar')) {
              let emoji = '📡';
              let badgeColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
              let title = 'Tolee Radar Update';

              if (notification.type === 'radar_alert') {
                emoji = '🚨';
                badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                title = '🚨 Radar Alert';
              } else if (notification.type === 'radar_food') {
                emoji = '🍔';
                badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
                title = '🍔 Secret Food Spot';
              } else if (notification.type === 'radar_news') {
                emoji = '📢';
                badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
                title = '📢 Local News';
              } else if (notification.type === 'radar_deal') {
                emoji = '🎉';
                badgeColor = 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
                title = '🎉 Flash Deal';
              } else if (notification.type === 'radar_gupt') {
                emoji = '🕵️';
                badgeColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
                title = '🕵️ Gupt Khabar';
              }

              return (
                <Link key={notification.id} href={notification.link || '/radar'}>
                  <Card className="border-teal-500/20 dark:border-teal-500/10 bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-zinc-950 dark:to-zinc-950 hover:from-teal-50/60 dark:hover:from-teal-950/30 transition-all rounded-2xl mb-4 shadow-sm relative overflow-hidden group">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-teal-100/80 dark:bg-teal-950 text-2xl shadow-xs">
                        {emoji}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                            {title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-300'} leading-relaxed`}>
                          {notification.message}
                        </p>
                        <div className="pt-1 flex items-center text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:underline gap-1">
                          <span>View on Neighborhood Radar</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 bg-teal-500 rounded-full flex-shrink-0 mt-2 animate-pulse"></div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            }

            return (
              <Link key={notification.id} href={notification.link || '#'}>
                <Card className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors rounded-xl mb-4 ${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgColor}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[15px] ${!notification.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
