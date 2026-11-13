'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users, Search, Filter, MessageSquare, CheckCircle, XCircle, Clock,
  AlertCircle, ExternalLink, RefreshCw, Send, ChevronDown, Eye, DollarSign,
  TrendingUp, Award, Phone, Mail, MapPin, Sparkles, X
} from 'lucide-react';

interface Creator {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  city: string;
  country: string;
  avatar: string | null;
  instagramLink: string | null;
  youtubeLink: string | null;
  facebookLink: string | null;
  telegramLink: string | null;
  otherLinks: string | null;
  followersRange: string;
  monthlyReach: string | null;
  avgReelViews: string | null;
  niche: string;
  contentType: string | null;
  reelCharges: number | null;
  collaborationCharges: number | null;
  statusVideoCharges: number | null;
  additionalPricingDetails: string | null;
  status: string;
  creatorTier: string | null;
  adminNotes: string | null;
  createdAt: string;
  conversationId: string | null;
  unreadAdminCount: number;
  lastMessageText: string | null;
  lastMessageAt: string | null;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string; // 'admin' | 'creator'
  message: string;
  isRead: boolean;
  createdAt: string;
}

const NICHES = [
  'Comedy', 'Real Estate', 'Fashion', 'Makeup & Beauty', 'Tech', 'Business',
  'Gaming', 'Motivation', 'Food & Cooking', 'News', 'Education', 'Music',
  'Dance', 'Sports', 'Travel', 'Finance & Investment', 'Health & Fitness',
  'Parenting', 'Astrology', 'Politics', 'Entertainment', 'Vlogs'
];

const FOLLOWER_RANGES = ['1K–10K', '10K–50K', '50K–100K', '100K–500K', '500K–1M', '1M+'];

const QUICK_TEMPLATES = [
  "Hi! We have an Expo client campaign matching your niche. Would you be available for a promotional Reel this week?",
  "Can you confirm your commercial rate for a Reel + 24hr Status combo for our upcoming Expo launch?",
  "The client has reviewed your profile and loved your content! Sharing the brief & product details below.",
  "Payment terms: 50% advance upon script confirmation and 50% upon draft approval before publishing.",
];

export default function SuperAdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [followersFilter, setFollowersFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');

  // Profile Modal
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalTier, setModalTier] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Chat System
  const [activeChatCreator, setActiveChatCreator] = useState<Creator | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fetch creators
  const fetchCreators = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (nicheFilter !== 'all') params.set('niche', nicheFilter);
      if (followersFilter !== 'all') params.set('followers', followersFilter);
      if (cityFilter) params.set('city', cityFilter);

      const res = await fetch(`/api/super-admin/creators?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.applications)) {
        setCreators(data.applications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [statusFilter, nicheFilter, followersFilter]);

  // Periodic polling for chat messages if chat is open
  useEffect(() => {
    if (!activeChatCreator) return;

    const loadChat = async () => {
      try {
        const res = await fetch(`/api/creator/chat?creatorUserId=${activeChatCreator.userId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [activeChatCreator?.userId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleOpenChat = async (creator: Creator) => {
    setActiveChatCreator(creator);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/creator/chat?creatorUserId=${creator.userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setChatMessages(data.messages);
        // Clear unread count locally
        setCreators(prev => prev.map(c => c.id === creator.id ? { ...c, unreadAdminCount: 0 } : c));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || messageInput;
    if (!text.trim() || !activeChatCreator) return;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/creator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorUserId: activeChatCreator.userId,
          message: text.trim(),
        })
      });
      const data = await res.json();
      if (data.success && data.message) {
        setChatMessages(prev => [...prev, data.message]);
        setMessageInput('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOpenProfile = (creator: Creator) => {
    setSelectedCreator(creator);
    setModalStatus(creator.status);
    setModalTier(creator.creatorTier || 'creator');
    setModalNotes(creator.adminNotes || '');
  };

  const handleUpdateStatus = async (status: string, tier?: string, notes?: string) => {
    if (!selectedCreator) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/super-admin/creators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCreator.id,
          status: status || modalStatus,
          creatorTier: tier !== undefined ? tier : modalTier,
          adminNotes: notes !== undefined ? notes : modalNotes,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCreator(prev => prev ? {
          ...prev,
          status: status || modalStatus,
          creatorTier: tier !== undefined ? tier : modalTier,
          adminNotes: notes !== undefined ? notes : modalNotes,
        } : null);
        fetchCreators();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalPending = creators.filter(c => c.status === 'pending').length;
  const totalApproved = creators.filter(c => c.status === 'approved').length;
  const totalUnreadChats = creators.reduce((sum, c) => sum + (c.unreadAdminCount || 0), 0);

  return (
    <div style={{ padding: '24px 32px', color: '#fff', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🌟</span>
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
              Creator Program & Influencer Management
            </h1>
          </div>
          <p style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>
            Manage registered creators, review commercial rates for Tolee Expo campaigns, and chat directly in real-time.
          </p>
        </div>

        <button
          onClick={fetchCreators}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#18181b', border: '1px solid #27272a', borderRadius: 10,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ color: '#71717a', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Applicants</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginTop: 4 }}>{creators.length}</div>
          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>Registered Influencers</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #eab30833', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ color: '#eab308', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#facc15', marginTop: 4 }}>{totalPending}</div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Awaiting verification</div>
        </div>

        <div style={{ background: '#121215', border: '1px solid #22c55e33', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Approved Creators</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', marginTop: 4 }}>{totalApproved}</div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Active campaign pool</div>
        </div>

        <div style={{ background: '#121215', border: totalUnreadChats > 0 ? '1px solid #ef444466' : '1px solid #1f1f23', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ color: totalUnreadChats > 0 ? '#f87171' : '#71717a', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Unread Messages</span>
            {totalUnreadChats > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: totalUnreadChats > 0 ? '#f87171' : '#fff', marginTop: 4 }}>{totalUnreadChats}</div>
          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Creator replies pending</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 16, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#71717a' }} />
            <input
              type="text"
              placeholder="Search by name, handle, email, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchCreators()}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', background: '#18181b',
                border: '1px solid #27272a', borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 12px', background: '#18181b', border: '1px solid #27272a',
              borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none'
            }}
          >
            <option value="all">All Application Statuses</option>
            <option value="pending">⏳ Pending Review</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="on_hold">⏸️ On Hold</option>
          </select>

          {/* Niche Filter */}
          <select
            value={nicheFilter}
            onChange={e => setNicheFilter(e.target.value)}
            style={{
              padding: '9px 12px', background: '#18181b', border: '1px solid #27272a',
              borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none'
            }}
          >
            <option value="all">All Content Niches</option>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Followers Filter */}
          <select
            value={followersFilter}
            onChange={e => setFollowersFilter(e.target.value)}
            style={{
              padding: '9px 12px', background: '#18181b', border: '1px solid #27272a',
              borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none'
            }}
          >
            <option value="all">All Follower Ranges</option>
            {FOLLOWER_RANGES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Search Button */}
          <button
            onClick={fetchCreators}
            style={{
              padding: '9px 16px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Filter & Search
          </button>
        </div>
      </div>

      {/* Main Content: Table & Live Chat Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: activeChatCreator ? '1fr 420px' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Table Container */}
        <div style={{ background: '#121215', border: '1px solid #1f1f23', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f1f23', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Creators & Commercial Rates ({creators.length})</div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#18181b', color: '#71717a', borderBottom: '1px solid #27272a' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Creator</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reach & Stats</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Niche</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Commercial Rates (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                      Loading creators and commercial rates...
                    </td>
                  </tr>
                ) : creators.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
                      No creator applications found matching filters.
                    </td>
                  </tr>
                ) : (
                  creators.map(c => {
                    const isChatActive = activeChatCreator?.id === c.id;
                    const statusColor = c.status === 'approved' ? '#22c55e' : c.status === 'rejected' ? '#ef4444' : c.status === 'on_hold' ? '#38bdf8' : '#eab308';

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid #1f1f23',
                          background: isChatActive ? '#1f1f29' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        {/* Creator Info */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', background: '#27272a',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                              border: '1px solid #3f3f46'
                            }}>
                              {c.avatar ? (
                                <img src={c.avatar} alt={c.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontWeight: 800, color: '#a855f7' }}>{c.fullName.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{c.fullName}</div>
                              <div style={{ color: '#a855f7', fontSize: 11, fontWeight: 600 }}>@{c.username}</div>
                              <div style={{ color: '#71717a', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <MapPin size={10} /> {c.city}, {c.country}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Reach & Stats */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{c.followersRange}</div>
                          <div style={{ color: '#71717a', fontSize: 11 }}>
                            Reach: <span style={{ color: '#d4d4d8' }}>{c.monthlyReach || '—'}</span>
                          </div>
                          <div style={{ color: '#71717a', fontSize: 11 }}>
                            Avg Reel: <span style={{ color: '#d4d4d8' }}>{c.avgReelViews || '—'}</span>
                          </div>
                        </td>

                        {/* Niche */}
                        <td style={{ padding: '14px 16px', maxWidth: 160 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {c.niche.split(',').slice(0, 3).map(n => (
                              <span key={n} style={{ background: '#27272a', color: '#e4e4e7', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>
                                {n.trim()}
                              </span>
                            ))}
                            {c.niche.split(',').length > 3 && (
                              <span style={{ color: '#71717a', fontSize: 10 }}>+{c.niche.split(',').length - 3}</span>
                            )}
                          </div>
                        </td>

                        {/* Commercial Rates */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '6px 10px', display: 'inline-block' }}>
                            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                              <div>
                                <span style={{ color: '#71717a' }}>Reel: </span>
                                <strong style={{ color: '#facc15' }}>{c.reelCharges ? `₹${c.reelCharges.toLocaleString()}` : '—'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#71717a' }}>Collab: </span>
                                <strong style={{ color: '#4ade80' }}>{c.collaborationCharges ? `₹${c.collaborationCharges.toLocaleString()}` : '—'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#71717a' }}>Status: </span>
                                <strong style={{ color: '#38bdf8' }}>{c.statusVideoCharges ? `₹${c.statusVideoCharges.toLocaleString()}` : '—'}</strong>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                            borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor
                          }}>
                            {c.status === 'approved' ? 'Approved' : c.status === 'rejected' ? 'Rejected' : c.status === 'on_hold' ? 'On Hold' : 'Pending'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => handleOpenChat(c)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                                background: isChatActive ? '#7c3aed' : '#27272a',
                                border: isChatActive ? '1px solid #8b5cf6' : '1px solid #3f3f46',
                                borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              <MessageSquare size={12} />
                              Chat
                              {c.unreadAdminCount > 0 && (
                                <span style={{
                                  position: 'absolute', top: -4, right: -4, background: '#ef4444',
                                  color: '#fff', width: 16, height: 16, borderRadius: '50%',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900
                                }}>
                                  {c.unreadAdminCount}
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => handleOpenProfile(c)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                                background: '#18181b', border: '1px solid #27272a', borderRadius: 8,
                                color: '#a1a1aa', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Chat Drawer */}
        {activeChatCreator && (
          <div style={{
            background: '#121215', border: '1px solid #1f1f23', borderRadius: 16,
            display: 'flex', flexDirection: 'column', height: 680, overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f1f23', background: '#18181b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#27272a', overflow: 'hidden', border: '1px solid #3f3f46' }}>
                  {activeChatCreator.avatar ? (
                    <img src={activeChatCreator.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 700 }}>
                      {activeChatCreator.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{activeChatCreator.fullName}</div>
                  <div style={{ fontSize: 11, color: '#a855f7' }}>@{activeChatCreator.username} • {activeChatCreator.followersRange}</div>
                </div>
              </div>

              <button
                onClick={() => setActiveChatCreator(null)}
                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Rates Banner */}
            <div style={{ background: '#1c1917', borderBottom: '1px solid #292524', padding: '8px 14px', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#a8a29e' }}>Commercials:</span>
              <span style={{ color: '#facc15', fontWeight: 700 }}>Reel: ₹{activeChatCreator.reelCharges ? activeChatCreator.reelCharges.toLocaleString() : 'N/A'}</span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>Collab: ₹{activeChatCreator.collaborationCharges ? activeChatCreator.collaborationCharges.toLocaleString() : 'N/A'}</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>Status: ₹{activeChatCreator.statusVideoCharges ? activeChatCreator.statusVideoCharges.toLocaleString() : 'N/A'}</span>
            </div>

            {/* Messages Area */}
            <div ref={chatScrollRef} style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#09090b' }}>
              {chatLoading ? (
                <div style={{ textAlign: 'center', color: '#71717a', padding: 40 }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  Loading conversation history...
                </div>
              ) : chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#71717a', padding: 40, fontSize: 12 }}>
                  <p>💬 No messages in this conversation yet.</p>
                  <p style={{ marginTop: 4 }}>Send campaign requirements or negotiate commercial terms below!</p>
                </div>
              ) : (
                chatMessages.map(m => {
                  const isAdmin = m.senderRole === 'admin';
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: isAdmin ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : '#27272a',
                        color: '#fff',
                        borderRadius: 14,
                        borderBottomRightRadius: isAdmin ? 2 : 14,
                        borderBottomLeftRadius: !isAdmin ? 2 : 14,
                        padding: '10px 14px',
                        fontSize: 12,
                        lineHeight: 1.45,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isAdmin ? '#d8b4fe' : '#38bdf8', marginBottom: 2 }}>
                        {isAdmin ? 'Super Admin / Tolee Team' : activeChatCreator.fullName}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Templates Drawer */}
            <div style={{ padding: '8px 12px', background: '#121215', borderTop: '1px solid #1f1f23', display: 'flex', gap: 6, overflowX: 'auto' }}>
              {QUICK_TEMPLATES.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(tmpl)}
                  style={{
                    background: '#18181b', border: '1px solid #27272a', borderRadius: 8,
                    padding: '4px 8px', color: '#a1a1aa', fontSize: 10, whiteSpace: 'nowrap', cursor: 'pointer'
                  }}
                  title={tmpl}
                >
                  ⚡ {tmpl.slice(0, 24)}...
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div style={{ padding: 12, background: '#18181b', borderTop: '1px solid #27272a', display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Type campaign brief, terms, or negotiation message..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1, padding: '10px 14px', background: '#27272a',
                  border: '1px solid #3f3f46', borderRadius: 10, color: '#fff', fontSize: 12, outline: 'none'
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={sendingMessage || !messageInput.trim()}
                style={{
                  padding: '0 16px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Creator Profile Modal */}
      {selectedCreator && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#121215', border: '1px solid #27272a', borderRadius: 20,
            maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#27272a', overflow: 'hidden', border: '1px solid #3f3f46' }}>
                  {selectedCreator.avatar ? (
                    <img src={selectedCreator.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 20, fontWeight: 800 }}>
                      {selectedCreator.fullName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{selectedCreator.fullName}</h2>
                  <div style={{ color: '#a855f7', fontSize: 13, fontWeight: 700 }}>@{selectedCreator.username}</div>
                  <div style={{ color: '#71717a', fontSize: 12 }}>Applied: {new Date(selectedCreator.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreator(null)}
                style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* 1. Basic Details */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', marginBottom: 10 }}>
                  👤 1. Basic Details
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: '#d4d4d8' }}>
                  <div><strong>Email:</strong> {selectedCreator.email}</div>
                  <div><strong>Mobile:</strong> {selectedCreator.mobile}</div>
                  <div><strong>City:</strong> {selectedCreator.city}</div>
                  <div><strong>Country:</strong> {selectedCreator.country}</div>
                </div>
              </div>

              {/* 2. Social Media Links */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', marginBottom: 10 }}>
                  📱 2. Social Media Links
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedCreator.instagramLink ? (
                    <a href={selectedCreator.instagramLink} target="_blank" rel="noreferrer" style={{ color: '#e1306c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Instagram Profile <ExternalLink size={11} />
                    </a>
                  ) : <span style={{ color: '#71717a' }}>No Instagram</span>}

                  {selectedCreator.youtubeLink ? (
                    <a href={selectedCreator.youtubeLink} target="_blank" rel="noreferrer" style={{ color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      YouTube Channel <ExternalLink size={11} />
                    </a>
                  ) : <span style={{ color: '#71717a' }}>No YouTube</span>}

                  {selectedCreator.facebookLink && (
                    <a href={selectedCreator.facebookLink} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Facebook Page <ExternalLink size={11} />
                    </a>
                  )}

                  {selectedCreator.telegramLink && (
                    <a href={selectedCreator.telegramLink} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Telegram Channel <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* 3 & 4. Statistics & Niches */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', marginBottom: 10 }}>
                  📊 3 & 4. Creator Stats & Niches
                </div>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: '#d4d4d8' }}>
                  <div><strong>Followers:</strong> <span style={{ color: '#38bdf8' }}>{selectedCreator.followersRange}</span></div>
                  <div><strong>Monthly Reach:</strong> {selectedCreator.monthlyReach || '—'}</div>
                  <div><strong>Avg Reel Views:</strong> {selectedCreator.avgReelViews || '—'}</div>
                  <div><strong>Niches:</strong> {selectedCreator.niche}</div>
                  <div><strong>Content Types:</strong> {selectedCreator.contentType || '—'}</div>
                </div>
              </div>

              {/* 5. Tolee Expo Commercial Rates */}
              <div style={{ background: '#1c1917', border: '1px solid #78350f55', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#facc15', textTransform: 'uppercase', marginBottom: 10 }}>
                  🎪 5. Tolee Expo Commercial Rates
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', marginBottom: 8 }}>
                  <div style={{ background: '#292524', padding: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#a8a29e' }}>Per Reel</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15' }}>
                      {selectedCreator.reelCharges ? `₹${selectedCreator.reelCharges.toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: '#292524', padding: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#a8a29e' }}>Brand Collab</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>
                      {selectedCreator.collaborationCharges ? `₹${selectedCreator.collaborationCharges.toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                  <div style={{ background: '#292524', padding: 8, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#a8a29e' }}>Status Video</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8' }}>
                      {selectedCreator.statusVideoCharges ? `₹${selectedCreator.statusVideoCharges.toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                </div>
                {selectedCreator.additionalPricingDetails && (
                  <div style={{ fontSize: 11, color: '#d4d4d8', background: '#0c0a09', padding: 8, borderRadius: 8, marginTop: 6 }}>
                    <strong style={{ color: '#e7e5e4' }}>Additional Notes:</strong> {selectedCreator.additionalPricingDetails}
                  </div>
                )}
              </div>
            </div>

            {/* Application Status & Admin Decision */}
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', textTransform: 'uppercase', marginBottom: 12 }}>
                ⚙️ Status & Tier Management
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Application Status</label>
                  <select
                    value={modalStatus}
                    onChange={e => setModalStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  >
                    <option value="pending">⏳ Pending Review</option>
                    <option value="approved">✅ Approved</option>
                    <option value="rejected">❌ Rejected</option>
                    <option value="on_hold">⏸️ On Hold</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Creator Tier</label>
                  <select
                    value={modalTier}
                    onChange={e => setModalTier(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  >
                    <option value="creator">🌱 Creator</option>
                    <option value="influencer">⭐ Influencer</option>
                    <option value="vip_creator">💎 VIP Creator</option>
                    <option value="verified_creator">✅ Verified Creator</option>
                    <option value="premium_partner">👑 Premium Partner</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Admin Notes / Feedback</label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="Notes for the creator or internal review team..."
                  style={{ width: '100%', padding: '8px 12px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, color: '#fff', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => {
                    handleOpenChat(selectedCreator);
                    setSelectedCreator(null);
                  }}
                  style={{
                    padding: '8px 16px', background: '#27272a', border: '1px solid #3f3f46',
                    borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  <MessageSquare size={13} /> Open Chat
                </button>

                <button
                  onClick={() => handleUpdateStatus(modalStatus, modalTier, modalNotes)}
                  disabled={updatingStatus}
                  style={{
                    padding: '8px 20px', background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {updatingStatus ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
