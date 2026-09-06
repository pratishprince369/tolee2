require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors({
  origin: '*', // Allow all origins for signaling, or configure specific domains
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Tolee Signaling Server',
    onlineNow: activeSessions.size,
    activeCalls: activeCalls.size,
    uptime: process.uptime()
  });
});

// Realtime presence REST endpoint (HTTP fallback for super-admin polling)
app.get('/presence', (req, res) => {
  const sessionsArray = Array.from(activeSessions.values());
  const deviceStats = {};
  const locationStats = {};
  sessionsArray.forEach(s => {
    const dev = s.device || 'Desktop Web';
    const loc = s.location || 'India';
    deviceStats[dev] = (deviceStats[dev] || 0) + 1;
    locationStats[loc] = (locationStats[loc] || 0) + 1;
  });
  res.json({
    count: activeSessions.size,
    sessions: sessionsArray,
    deviceStats,
    locationStats
  });
});

// REST Presence Query for specific User IDs
app.post('/api/presence/query', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.json({ success: true, presence: {} });
    }

    const presence = {};
    const dbUserIds = [];

    userIds.forEach(uid => {
      const isOnline = activeUsers.has(uid) && activeUsers.get(uid).size > 0;
      if (isOnline) {
        presence[uid] = {
          isOnline: true,
          lastSeenAt: new Date().toISOString()
        };
      } else {
        dbUserIds.push(uid);
      }
    });

    if (dbUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: dbUserIds } },
        select: { id: true, lastActiveAt: true, showActivityStatus: true }
      });

      users.forEach(u => {
        presence[u.id] = {
          isOnline: false,
          lastSeenAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
          showActivityStatus: u.showActivityStatus !== false
        };
      });
    }

    res.json({ success: true, presence });
  } catch (err) {
    console.error('[Signaling] Presence query error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Tolee Signaling Server', version: '1.0.0' });
});

// Crash protection
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 15000
});

// Map of userId -> Set of socketIds (handles multiple active tabs/devices)
const activeUsers = new Map();
// Map of socketId -> userId
const socketToUser = new Map();
// Map of callId -> callInfo
const activeCalls = new Map();

// Map of socketId -> Session Details (Realtime Presence)
const activeSessions = new Map();

// Grace period timeouts for disconnects (prevents flicker on refresh)
const disconnectTimeouts = new Map();
// Throttled DB update tracker (userId -> timestamp ms)
const lastDbUpdate = new Map();

function broadcastPresence() {
  const sessionsArray = Array.from(activeSessions.values());
  const totalCount = activeSessions.size;

  // Compile Device & Location stats
  const deviceStats = {};
  const locationStats = {};

  sessionsArray.forEach(s => {
    const dev = s.device || 'Desktop Web';
    const loc = s.location || 'Mumbai, India';
    deviceStats[dev] = (deviceStats[dev] || 0) + 1;
    locationStats[loc] = (locationStats[loc] || 0) + 1;
  });

  io.emit('realtime-presence', {
    count: totalCount,
    sessions: sessionsArray,
    deviceStats,
    locationStats
  });
}


// Helper to send push notifications via the Web Next.js server
async function triggerPushNotification(receiverId, callerId, callerName, callerAvatar, callType, callId) {
  try {
    const webUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tolee.in';
    const secret = process.env.INTERNAL_API_SECRET || 'internal-tolee-secret-calling-2026';
    
    const response = await fetch(`${webUrl}/api/notifications/send-call-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`
      },
      body: JSON.stringify({
        receiverId,
        callerId,
        callerName,
        callerAvatar,
        callType,
        callId
      })
    });
    const data = await response.json();
    console.log(`[Signaling] Push notification trigger result for ${receiverId}:`, data);
  } catch (err) {
    console.error('[Signaling] Failed to send push notification to offline receiver:', err);
  }
}

// Helper to log a call as a chat message in DB
async function logCallAsChatMessage(callerId, receiverId, type, status, duration) {
  try {
    // 1. Find existing personal DM
    const chats = await prisma.chat.findMany({
      where: {
        isGroupChat: false,
        participants: {
          some: { userId: callerId }
        }
      },
      include: {
        participants: true
      }
    });

    let chat = chats.find(c => c.participants.some(p => p.userId === receiverId));
    if (!chat) {
      // Create chat if it doesn't exist
      chat = await prisma.chat.create({
        data: {
          isGroupChat: false,
          status: 'accepted',
          participants: {
            create: [
              { userId: callerId },
              { userId: receiverId }
            ]
          }
        }
      });
    }

    const content = `[CALL_LOG]:${type}:${status}:${duration}`;
    await prisma.message.create({
      data: {
        content,
        senderId: callerId,
        chatId: chat.id,
        isRead: false
      }
    });
    console.log(`[Signaling] Call log logged as message in chat: ${chat.id}`);
  } catch (err) {
    console.error('[Signaling] Failed to log call as message:', err);
  }
}

io.on('connection', (socket) => {
  console.log('[Signaling] Socket connected:', socket.id);

  // Realtime Presence: Register Client Session
  socket.on('register-session', ({ userId, name, device, location, currentPage }) => {
    activeSessions.set(socket.id, {
      socketId: socket.id,
      userId: userId || null,
      name: name || 'Guest User',
      device: device || 'Desktop Web',
      location: location || 'Mumbai, India',
      currentPage: currentPage || '/',
      connectedAt: Date.now()
    });

    if (userId) {
      socketToUser.set(socket.id, userId);
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId).add(socket.id);
      
      // Update last active in db asynchronously
      prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() }
      }).catch(err => console.error('[Signaling] Failed to update presence in DB:', err));
    }

    broadcastPresence();
  });

  // Realtime Presence: Update Current Page Location
  socket.on('update-session-page', ({ currentPage }) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.currentPage = currentPage || '/';
      activeSessions.set(socket.id, session);
      broadcastPresence();
    }
  });

  // 1. Register User Session
  socket.on('register-user', async ({ userId }) => {
    if (!userId) return;
    
    // Clear any pending disconnect grace timeout
    if (disconnectTimeouts.has(userId)) {
      clearTimeout(disconnectTimeouts.get(userId));
      disconnectTimeouts.delete(userId);
    }

    socketToUser.set(socket.id, userId);
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);
    
    console.log(`[Signaling] User registered: ${userId} on socket ${socket.id} (Active sockets: ${activeUsers.get(userId).size})`);
    
    const now = new Date();
    // Throttled DB update on connect (at most once every 30s)
    const lastUpdate = lastDbUpdate.get(userId) || 0;
    if (Date.now() - lastUpdate > 30000) {
      lastDbUpdate.set(userId, Date.now());
      prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: now }
      }).catch(dbErr => console.error('[Signaling] Failed to update presence in DB:', dbErr));
    }

    // Broadcast user online status with server timestamp
    io.emit('user-status-changed', {
      userId,
      status: 'online',
      isOnline: true,
      lastSeenAt: now.toISOString(),
      lastActiveAt: now.toISOString()
    });

    // Check if there is an active ringing call for this user
    activeCalls.forEach((callInfo, callId) => {
      if (callInfo.receiverId === userId && callInfo.status === 'ringing') {
        console.log(`[Signaling] Delivering pending call ${callId} to newly registered user ${userId}`);
        socket.emit('incoming-call', {
          fromUserId: callInfo.callerId,
          fromName: callInfo.callerName || 'Tolee User',
          fromAvatar: callInfo.callerAvatar || '/default-user-avatar.svg',
          offer: callInfo.offer,
          type: callInfo.type,
          callId: callInfo.callId
        });
      }
    });
  });

  // Realtime Presence Heartbeat
  socket.on('user-presence-heartbeat', async ({ userId }) => {
    if (!userId) return;

    if (disconnectTimeouts.has(userId)) {
      clearTimeout(disconnectTimeouts.get(userId));
      disconnectTimeouts.delete(userId);
    }

    socketToUser.set(socket.id, userId);
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    const now = new Date();
    const lastUpdate = lastDbUpdate.get(userId) || 0;
    // Throttled DB write: persist at most every 60s per user during heartbeat
    if (Date.now() - lastUpdate > 60000) {
      lastDbUpdate.set(userId, Date.now());
      prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: now }
      }).catch(err => console.error('[Signaling] Heartbeat DB update error:', err));
    }

    socket.emit('presence-heartbeat-ack', {
      success: true,
      serverTime: now.toISOString()
    });
  });

  // Direct presence query over WebSocket
  socket.on('get-users-presence', async ({ userIds }, callback) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      if (typeof callback === 'function') callback({ presence: {} });
      return;
    }

    const presence = {};
    const dbUserIds = [];

    userIds.forEach(uid => {
      const isOnline = activeUsers.has(uid) && activeUsers.get(uid).size > 0;
      if (isOnline) {
        presence[uid] = {
          isOnline: true,
          lastSeenAt: new Date().toISOString()
        };
      } else {
        dbUserIds.push(uid);
      }
    });

    if (dbUserIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: dbUserIds } },
          select: { id: true, lastActiveAt: true, showActivityStatus: true }
        });
        users.forEach(u => {
          presence[u.id] = {
            isOnline: false,
            lastSeenAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
            showActivityStatus: u.showActivityStatus !== false
          };
        });
      } catch (err) {
        console.error('[Signaling] Error fetching presence from DB:', err);
      }
    }

    if (typeof callback === 'function') {
      callback({ presence });
    } else {
      socket.emit('users-presence-response', { presence });
    }
  });

  // 2. Initiate Audio/Video Call
  socket.on('call-user', async ({ toUserId, callerName, callerAvatar, offer, type, callId }) => {
    const callerId = socketToUser.get(socket.id);
    if (!callerId) return;

    console.log(`[Signaling] ${callerName} (${callerId}) is calling ${toUserId} via ${type}`);

    // Create call history log in database as "ringing" initially
    let dbCall;
    try {
      dbCall = await prisma.call.create({
        data: {
          id: callId,
          callerId,
          receiverId: toUserId,
          type,
          status: 'ringing',
          duration: 0
        }
      });
    } catch (err) {
      console.error('[Signaling] Error logging call in database:', err);
    }

    // Always trigger Firebase push call notification to ensure the mobile app rings
    await triggerPushNotification(toUserId, callerId, callerName, callerAvatar, type, callId);

    // Create active call information in memory with a 35s auto-timeout
    const callInfo = {
      callId,
      callerId,
      receiverId: toUserId,
      callerName,
      callerAvatar,
      offer,
      type,
      status: 'ringing',
      startTime: Date.now(),
      callerSocketId: socket.id,
      timeoutId: null
    };

    callInfo.timeoutId = setTimeout(async () => {
      const activeCall = activeCalls.get(callId);
      if (activeCall && activeCall.status === 'ringing') {
        console.log(`[Signaling] Call timed out (no answer): ${callId}`);

        // Update DB call status to missed
        try {
          await prisma.call.update({
            where: { id: callId },
            data: { status: 'missed' }
          });
        } catch (dbErr) {
          console.error(dbErr);
        }

        // Inform caller
        io.to(activeCall.callerSocketId).emit('call-failed', { callId, reason: 'no-answer' });

        // Inform receiver sockets if any
        const receiverSockets = activeUsers.get(toUserId);
        if (receiverSockets) {
          receiverSockets.forEach(socketId => {
            io.to(socketId).emit('call-ended', { callId });
          });
        }

        // Log missed call in chat messages
        await logCallAsChatMessage(callerId, toUserId, type, 'missed', 0);

        activeCalls.delete(callId);
      }
    }, 35000);

    activeCalls.set(callId, callInfo);

    // Send incoming-call socket event if receiver has active tabs
    const receiverSockets = activeUsers.get(toUserId);
    if (receiverSockets && receiverSockets.size > 0) {
      receiverSockets.forEach(socketId => {
        io.to(socketId).emit('incoming-call', {
          fromUserId: callerId,
          fromName: callerName,
          fromAvatar: callerAvatar,
          offer,
          type,
          callId
        });
      });
    }

    // Emit ringing back to caller
    socket.emit('call-ringing', { callId });
  });

  // 3. Accept Incoming Call
  socket.on('accept-call', async ({ callId, answer }) => {
    const callInfo = activeCalls.get(callId);
    if (!callInfo) return;

    // Clear auto-cancel timeout
    if (callInfo.timeoutId) {
      clearTimeout(callInfo.timeoutId);
      callInfo.timeoutId = null;
    }

    console.log(`[Signaling] Call accepted: ${callId}`);
    callInfo.status = 'connected';
    callInfo.connectedTime = Date.now();
    activeCalls.set(callId, callInfo);

    // Update DB call log status
    try {
      await prisma.call.update({
        where: { id: callId },
        data: { status: 'connected' }
      });
    } catch (err) {
      console.error('[Signaling] Failed to update call connected state in DB:', err);
    }

    // Forward answer to caller
    io.to(callInfo.callerSocketId).emit('call-accepted', { callId, answer });
  });

  // 4. Reject Incoming Call
  socket.on('reject-call', async ({ callId, reason }) => {
    const callInfo = activeCalls.get(callId);
    if (!callInfo) return;

    // Clear auto-cancel timeout
    if (callInfo.timeoutId) {
      clearTimeout(callInfo.timeoutId);
    }

    console.log(`[Signaling] Call rejected: ${callId} reason: ${reason}`);

    // Update DB call log status
    try {
      await prisma.call.update({
        where: { id: callId },
        data: { status: reason === 'busy' ? 'busy' : 'declined' }
      });
    } catch (err) {
      console.error('[Signaling] Failed to update call rejected state in DB:', err);
    }

    // Forward rejection to caller
    io.to(callInfo.callerSocketId).emit('call-rejected', { callId, reason });
    
    // Log call rejection/busy in chat messages
    await logCallAsChatMessage(callInfo.callerId, callInfo.receiverId, callInfo.type, reason === 'busy' ? 'busy' : 'declined', 0);
    
    activeCalls.delete(callId);
  });

  // 5. ICE Candidate Exchange
  socket.on('ice-candidate', ({ toUserId, candidate, callId }) => {
    console.log(`[Signaling] Relaying ICE candidate to ${toUserId}`);
    const receiverSockets = activeUsers.get(toUserId);
    if (receiverSockets) {
      receiverSockets.forEach(socketId => {
        io.to(socketId).emit('ice-candidate', { candidate, callId });
      });
    }
  });

  // 6. End Active Call
  socket.on('end-call', async ({ callId }) => {
    const callInfo = activeCalls.get(callId);
    if (!callInfo) return;

    // Clear auto-cancel timeout
    if (callInfo.timeoutId) {
      clearTimeout(callInfo.timeoutId);
    }

    console.log(`[Signaling] Call ended by peer: ${callId}`);
    const duration = Math.round((Date.now() - (callInfo.connectedTime || Date.now())) / 1000);

    // Update DB call log status and duration
    try {
      await prisma.call.update({
        where: { id: callId },
        data: { 
          duration,
          status: callInfo.status === 'connected' ? 'connected' : 'missed'
        }
      });
    } catch (err) {
      console.error('[Signaling] Failed to log call duration in DB:', err);
    }

    // Inform both caller and receiver to close WebRTC peers
    const peers = [callInfo.callerId, callInfo.receiverId];
    peers.forEach(peerId => {
      const peerSockets = activeUsers.get(peerId);
      if (peerSockets) {
        peerSockets.forEach(socketId => {
          io.to(socketId).emit('call-ended', { callId });
        });
      }
    });

    // Log call connected / missed status in chat messages
    if (callInfo.status !== 'connected') {
      await logCallAsChatMessage(callInfo.callerId, callInfo.receiverId, callInfo.type, 'missed', 0);
    } else {
      await logCallAsChatMessage(callInfo.callerId, callInfo.receiverId, callInfo.type, 'connected', duration);
    }
 
    activeCalls.delete(callId);
  });

  // 7. Check Presence Status of a User
  socket.on('check-presence', ({ userId }, callback) => {
    if (!userId) {
      callback({ status: 'offline' });
      return;
    }
    const sockets = activeUsers.get(userId);
    if (sockets && sockets.size > 0) {
      callback({ status: 'online' });
    } else {
      callback({ status: 'offline' });
    }
  });

  // Tolee Live Broadcasting Event Handlers
  socket.on('join-tolee-room', ({ toleeId, userId }) => {
    socket.join(`tolee-${toleeId}`);
    console.log(`[Live signaling] Socket ${socket.id} joined tolee room tolee-${toleeId} for user ${userId}`);
    
    // Broadcast updated viewer count to the room
    const clients = io.sockets.adapter.rooms.get(`tolee-${toleeId}`);
    const count = clients ? clients.size : 0;
    io.to(`tolee-${toleeId}`).emit('tolee-viewer-count-update', { toleeId, viewerCount: count });
  });

  socket.on('tolee-live-started', ({ toleeId, type }) => {
    console.log(`[Live signaling] Tolee ${toleeId} live started with type ${type}`);
    io.to(`tolee-${toleeId}`).emit('tolee-live-started', { toleeId, type });
  });

  socket.on('tolee-live-ended', ({ toleeId }) => {
    console.log(`[Live signaling] Tolee ${toleeId} live ended`);
    io.to(`tolee-${toleeId}`).emit('tolee-live-ended', { toleeId });
  });

  socket.on('tolee-join-request', ({ toleeId, userId, name, avatar }) => {
    console.log(`[Live signaling] User ${name} (${userId}) requesting to join live in Tolee ${toleeId}`);
    io.to(`tolee-${toleeId}`).emit('tolee-join-request', { toleeId, userId, name, avatar });
  });

  socket.on('tolee-member-join-request', async ({ toleeId, userId }) => {
    console.log(`[Tolee Member Join Request] User ${userId} requested to join Tolee ${toleeId}`);
    try {
      const count = await prisma.toleeMember.count({
        where: { toleeId, status: 'pending' }
      });
      io.to(`tolee-${toleeId}`).emit('tolee-member-join-request', { toleeId, requestCount: count });
    } catch (err) {
      console.error("Error handling tolee-member-join-request socket event:", err);
      io.to(`tolee-${toleeId}`).emit('tolee-member-join-request', { toleeId });
    }
  });

  socket.on('tolee-member-approval-update', async ({ toleeId, requestCount }) => {
    console.log(`[Tolee Member Approval Update] Tolee ${toleeId} updated pending count: ${requestCount}`);
    if (typeof requestCount === 'number') {
      io.to(`tolee-${toleeId}`).emit('tolee-member-approval-update', { toleeId, requestCount });
    } else {
      try {
        const count = await prisma.toleeMember.count({
          where: { toleeId, status: 'pending' }
        });
        io.to(`tolee-${toleeId}`).emit('tolee-member-approval-update', { toleeId, requestCount: count });
      } catch (err) {
        console.error("Error handling tolee-member-approval-update socket event:", err);
        io.to(`tolee-${toleeId}`).emit('tolee-member-approval-update', { toleeId });
      }
    }
  });

  socket.on('tolee-join-response', ({ toleeId, userId, approved }) => {
    console.log(`[Live signaling] Admin response for user ${userId} in Tolee ${toleeId}: ${approved}`);
    io.to(`tolee-${toleeId}`).emit('tolee-join-response', { toleeId, userId, approved });
  });

  socket.on('tolee-participant-joined', ({ toleeId, userId, name, avatar }) => {
    console.log(`[Live signaling] Participant ${name} joined live in Tolee ${toleeId}`);
    console.log(`[DEBUG] [User Joined Live] Participant ${name} (${userId}) joined live in Tolee ${toleeId}`);
    io.to(`tolee-${toleeId}`).emit('tolee-participant-joined', { toleeId, userId, name, avatar });
  });

  socket.on('tolee-participant-left', ({ toleeId, userId, name }) => {
    console.log(`[Live signaling] Participant ${name} left live in Tolee ${toleeId}`);
    io.to(`tolee-${toleeId}`).emit('tolee-participant-left', { toleeId, userId, name });
    
    // Broadcast updated viewer count
    const clients = io.sockets.adapter.rooms.get(`tolee-${toleeId}`);
    const count = clients ? clients.size : 0;
    io.to(`tolee-${toleeId}`).emit('tolee-viewer-count-update', { toleeId, viewerCount: count });
  });

  socket.on('tolee-live-chat', ({ toleeId, sender, avatar, message, time }) => {
    io.to(`tolee-${toleeId}`).emit('tolee-live-chat', { sender, avatar, message, time });
  });

  socket.on('tolee-live-reaction', ({ toleeId, emoji }) => {
    io.to(`tolee-${toleeId}`).emit('tolee-live-reaction', { emoji });
  });

  socket.on('tolee-live-hand-raise', ({ toleeId, userId, name, avatar }) => {
    io.to(`tolee-${toleeId}`).emit('tolee-live-hand-raise', { userId, name, avatar });
  });

  socket.on('tolee-live-speak-action', ({ toleeId, userId, action }) => {
    io.to(`tolee-${toleeId}`).emit('tolee-live-speak-action', { userId, action });
  });

  // WebRTC Live Stream Signaling Relays
  socket.on('tolee-webrtc-offer', ({ toleeId, toUserId, offer, fromUserId }) => {
    console.log(`[WebRTC Relay] Forwarding OFFER from ${fromUserId} to ${toUserId} in Tolee ${toleeId}`);
    const sockets = activeUsers.get(toUserId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(sid => {
        io.to(sid).emit('tolee-webrtc-offer', { toleeId, offer, fromUserId });
      });
      console.log(`[WebRTC Relay] OFFER delivered to ${sockets.size} socket(s) of user ${toUserId}`);
    } else {
      console.warn(`[WebRTC Relay] WARNING: No active sockets found for user ${toUserId} - OFFER NOT DELIVERED`);
    }
  });

  socket.on('tolee-webrtc-answer', ({ toleeId, toUserId, answer, fromUserId }) => {
    console.log(`[WebRTC Relay] Forwarding ANSWER from ${fromUserId} to ${toUserId} in Tolee ${toleeId}`);
    const sockets = activeUsers.get(toUserId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(sid => {
        io.to(sid).emit('tolee-webrtc-answer', { toleeId, answer, fromUserId });
      });
      console.log(`[WebRTC Relay] ANSWER delivered to ${sockets.size} socket(s) of user ${toUserId}`);
    } else {
      console.warn(`[WebRTC Relay] WARNING: No active sockets found for user ${toUserId} - ANSWER NOT DELIVERED`);
    }
  });

  socket.on('tolee-webrtc-ice-candidate', ({ toleeId, toUserId, candidate, fromUserId }) => {
    const sockets = activeUsers.get(toUserId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(sid => {
        io.to(sid).emit('tolee-webrtc-ice-candidate', { toleeId, candidate, fromUserId });
      });
    } else {
      console.warn(`[WebRTC Relay] ICE candidate from ${fromUserId} could not be delivered - user ${toUserId} not found`);
    }
  });

  // Google Meet Upgrade Socket.IO Relays
  socket.on('meeting-join-room', ({ meetingCode, userId }) => {
    const roomName = `meeting-${meetingCode}`;
    socket.join(roomName);
    console.log(`[Signaling] Socket ${socket.id} (User: ${userId}) joined meeting room: ${roomName}`);
  });

  socket.on('meeting-chat-message', ({ meetingCode, senderId, senderName, senderAvatar, text, timestamp }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-chat-message', {
      senderId,
      senderName,
      senderAvatar,
      text,
      timestamp
    });
  });

  socket.on('meeting-join-request', ({ meetingCode, userId, name, avatar }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-join-request', { userId, name, avatar });
    console.log(`[Signaling] Waiting room request from ${name} (${userId}) for meeting ${meetingCode}`);
  });

  socket.on('meeting-join-response', ({ meetingCode, userId, approved }) => {
    console.log(`[Signaling] Waiting room response for ${userId}: approved=${approved}`);
    const targetSockets = activeUsers.get(userId);
    if (targetSockets) {
      targetSockets.forEach(sid => {
        io.to(sid).emit('meeting-join-response', { approved });
      });
    }
  });

  socket.on('meeting-poll-created', ({ meetingCode, poll }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-poll-updated', poll);
  });

  socket.on('meeting-poll-vote', ({ meetingCode, poll }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-poll-updated', poll);
  });

  socket.on('meeting-qa-created', ({ meetingCode, qa }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-qa-updated', qa);
  });

  socket.on('meeting-qa-action', ({ meetingCode, qa }) => {
    const roomName = `meeting-${meetingCode}`;
    io.to(roomName).emit('meeting-qa-updated', qa);
  });

  // 9. Real-time general chat messages relay
  socket.on('send-chat-message', ({ id, messageId, chatId, senderId, senderName, senderAvatar, text, mediaUrl, mediaResourceType, mediaPublicId, isGroup, receiverId, createdAt, time, replyTo }) => {
    console.log(`[Signaling] Chat message sent in chat ${chatId} by user ${senderId}`);
    
    const messagePayload = {
      id: id || messageId || ('msg-' + Math.random().toString(36).substr(2, 9)),
      sender: senderName,
      senderId,
      senderAvatar,
      text,
      mediaUrl,
      mediaResourceType,
      mediaPublicId,
      isRead: false,
      createdAt,
      time,
      isMe: false,
      replyTo
    };

    if (isGroup) {
      // Group chat - broadcast to the room
      socket.to(`chat-${chatId}`).emit('chat-message-received', {
        chatId,
        message: messagePayload
      });
    } else if (receiverId) {
      // Personal chat - send to receiver's sockets
      const receiverSockets = activeUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach(sid => {
          io.to(sid).emit('chat-message-received', {
            chatId,
            message: messagePayload
          });
        });
      }
    }
  });

  socket.on('join-chat-rooms', ({ chatIds }) => {
    if (Array.isArray(chatIds)) {
      chatIds.forEach(id => {
        socket.join(`chat-${id}`);
        console.log(`[Signaling] Socket ${socket.id} joined group chat room: chat-${id}`);
      });
    }
  });

  // 10. Message Reactions relay
  socket.on('send-message-reaction', ({ chatId, messageId, reactions, isGroup, receiverId }) => {
    console.log(`[Signaling] Reaction update in chat ${chatId} for msg ${messageId}`);
    const payload = { chatId, messageId, reactions };
    if (isGroup) {
      socket.to(`chat-${chatId}`).emit('message-reaction-updated', payload);
    } else if (receiverId) {
      const receiverSockets = activeUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach(sid => io.to(sid).emit('message-reaction-updated', payload));
      }
    }
  });

  // 11. Message Edited relay
  socket.on('send-message-edit', ({ chatId, messageId, message, isGroup, receiverId }) => {
    console.log(`[Signaling] Message edited in chat ${chatId} for msg ${messageId}`);
    const payload = { chatId, messageId, message };
    if (isGroup) {
      socket.to(`chat-${chatId}`).emit('message-edited', payload);
    } else if (receiverId) {
      const receiverSockets = activeUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach(sid => io.to(sid).emit('message-edited', payload));
      }
    }
  });

  // 12. Message Deleted relay
  socket.on('send-message-delete', ({ chatId, messageId, message, isGroup, receiverId }) => {
    console.log(`[Signaling] Message deleted in chat ${chatId} for msg ${messageId}`);
    const payload = { chatId, messageId, message };
    if (isGroup) {
      socket.to(`chat-${chatId}`).emit('message-deleted', payload);
    } else if (receiverId) {
      const receiverSockets = activeUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach(sid => io.to(sid).emit('message-deleted', payload));
      }
    }
  });

  // 13. Message Pinned relay
  socket.on('send-message-pin', ({ chatId, messageId, isPinned, isGroup, receiverId }) => {
    console.log(`[Signaling] Message pin state in chat ${chatId} for msg ${messageId}: ${isPinned}`);
    const payload = { chatId, messageId, isPinned };
    if (isGroup) {
      socket.to(`chat-${chatId}`).emit('message-pinned', payload);
    } else if (receiverId) {
      const receiverSockets = activeUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach(sid => io.to(sid).emit('message-pinned', payload));
      }
    }
  });

  // 8. Disconnect Cleanup
  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room.startsWith('tolee-')) {
        const clients = io.sockets.adapter.rooms.get(room);
        const count = clients ? Math.max(0, clients.size - 1) : 0;
        socket.to(room).emit('tolee-viewer-count-update', { 
          toleeId: room.replace('tolee-', ''), 
          viewerCount: count 
        });
      }
    });
  });

  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id);

    // Clean up any active call involving this socket
    activeCalls.forEach(async (callInfo, callId) => {
      if (callInfo.callerSocketId === socket.id || (activeUsers.get(callInfo.receiverId) && activeUsers.get(callInfo.receiverId).has(socket.id))) {
        console.log(`[Signaling] Active call cleaned up due to socket disconnect: ${callId}`);

        // Clear timeout
        if (callInfo.timeoutId) {
          clearTimeout(callInfo.timeoutId);
        }

        // Inform partner peer
        const partnerId = callInfo.callerSocketId === socket.id ? callInfo.receiverId : callInfo.callerId;
        const partnerSockets = activeUsers.get(partnerId);
        if (partnerSockets) {
          partnerSockets.forEach(sId => {
            io.to(sId).emit('call-ended', { callId });
          });
        }

        // Update DB
        try {
          const duration = callInfo.connectedTime ? Math.round((Date.now() - callInfo.connectedTime) / 1000) : 0;
          await prisma.call.update({
            where: { id: callId },
            data: {
              duration,
              status: callInfo.status === 'connected' ? 'connected' : 'missed'
            }
          });
        } catch (dbErr) {
          console.error(dbErr);
        }

        // Delete active call
        activeCalls.delete(callId);
      }
    });

    if (userId) {
      const userSockets = activeUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          // Set a 4-second grace period before declaring user offline (handles page reloads & brief hops)
          if (disconnectTimeouts.has(userId)) {
            clearTimeout(disconnectTimeouts.get(userId));
          }

          const timeoutId = setTimeout(async () => {
            const currentSockets = activeUsers.get(userId);
            if (!currentSockets || currentSockets.size === 0) {
              activeUsers.delete(userId);
              disconnectTimeouts.delete(userId);

              const now = new Date();
              console.log(`[Signaling] User marked OFFLINE: ${userId} at ${now.toISOString()}`);
              
              try {
                await prisma.user.update({
                  where: { id: userId },
                  data: { lastActiveAt: now }
                });
              } catch (dbErr) {
                console.error('[Signaling] Failed to update offline lastSeen in DB:', dbErr);
              }

              // Broadcast user offline with authoritative server timestamp
              io.emit('user-status-changed', {
                userId,
                status: 'offline',
                isOnline: false,
                lastSeenAt: now.toISOString(),
                lastActiveAt: now.toISOString()
              });
            }
          }, 4000);

          disconnectTimeouts.set(userId, timeoutId);
        }
      }
    }
    
    // Cleanup active session presence tracking
    if (activeSessions.has(socket.id)) {
      activeSessions.delete(socket.id);
      broadcastPresence();
    }

    socketToUser.delete(socket.id);
    console.log('[Signaling] Socket disconnected ID:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[Signaling] Server running on port ${PORT}`);
});
