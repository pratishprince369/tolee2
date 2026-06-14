# 🏗️ TOLEE - COMPLETE ARCHITECTURE & WORKFLOWS

**Monorepo: Web (Next.js 14) + Mobile (Capacitor) + Backend (WebSocket)**

---

## 📊 SYSTEM OVERVIEW

```
┌────────────────────────────────────────────────────────────────────┐
│                      YOUR FULL SYSTEM ARCHITECTURE                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  CLIENTS:                                                          │
│  ├─ 🌐 Web Browser (Desktop/Mobile Browser)                       │
│  │   └─ Direct HTTPS → Next.js app                               │
│  │   └─ WebSocket → apps/api server                              │
│  │                                                                 │
│  └─ 📱 Mobile App (Android via Capacitor)                         │
│      └─ Same Next.js code (wrapped in WebView)                    │
│      └─ Native plugins: Camera, Push notifications                │
│      └─ Live reload from deployed website                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  BACKEND SERVICES:                                                 │
│  ├─ 🚀 apps/web (Next.js 14 - Frontend + Server)                  │
│  │   ├─ User interface & pages                                    │
│  │   ├─ API routes (/api/auth/, /api/upload/)                    │
│  │   ├─ Server Actions (Prisma queries)                           │
│  │   ├─ Email service (Resend integration)                        │
│  │   └─ Rate limiting & validation                                │
│  │                                                                 │
│  └─ 💬 apps/api (Node.js WebSocket Server)                        │
│      ├─ Real-time chat engine (Socket.io)                         │
│      ├─ Message broadcasting                                      │
│      ├─ Online/offline status                                     │
│      └─ Push notification triggers                                │
│                                                                    │
│  SHARED CODE:                                                      │
│  └─ 📦 packages/shared                                             │
│      ├─ TypeScript types/interfaces                               │
│      ├─ Validation utilities                                      │
│      └─ Common constants                                          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  EXTERNAL SERVICES:                                                │
│  ├─ 🐘 Neon PostgreSQL (Database)                                 │
│  │   └─ User, Chat, Post, EmailLog tables                         │
│  │                                                                 │
│  ├─ 📧 Resend API (Email Service)                                 │
│  │   └─ OTP verification emails                                   │
│  │                                                                 │
│  ├─ 🔥 Firebase Cloud Messaging (Push Notifications)              │
│  │   └─ Offline message delivery                                  │
│  │                                                                 │
│  ├─ ☁️ Cloudinary (Media Storage)                                 │
│  │   └─ Images, videos, files CDN                                 │
│  │                                                                 │
│  └─ 🔐 NextAuth.js (Authentication)                               │
│      └─ Session management, JWT tokens                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DETAILED WORKFLOW DIAGRAMS

### FLOW 1: SIGNUP → OTP → EMAIL → DATABASE

```
┌──────────────────────────────────────────────────────────────┐
│               SIGNUP FLOW (Web + Mobile Same)                │
└──────────────────────────────────────────────────────────────┘

1️⃣ USER FILLS FORM
   ┌─────────────────────────────────┐
   │ apps/web/src/app/auth/signup/   │
   │   - Email input                 │
   │   - Password input              │
   │   - Username input              │
   │                                 │
   │ SignupForm.tsx Component        │
   └────────────┬────────────────────┘
                │ User clicks "Sign Up"
                │ 
                ▼

2️⃣ FRONTEND VALIDATION
   ┌─────────────────────────────────┐
   │ Client-side checks:             │
   │ - Email format ✓                │
   │ - Password strength ✓           │
   │ - Username length ✓             │
   │ - No obvious spam patterns      │
   └────────────┬────────────────────┘
                │ POST /api/auth/register
                │
                ▼

3️⃣ BACKEND ENDPOINT
   ┌──────────────────────────────────────────┐
   │ apps/web/src/app/api/auth/register/     │
   │ route.ts (Next.js API Route)             │
   │                                          │
   │ 1. Parse request body                    │
   │ 2. Validate input (email, password)      │
   │ 3. Check email not duplicate             │
   │ 4. Run bot detection:                    │
   │    └─ apps/web/src/lib/botDetection.ts  │
   │       • Check username patterns          │
   │       • Check for spam signatures        │
   │       • Check rate limits                │
   │ 5. If invalid → return error             │
   │ 6. If valid → continue                   │
   └────────────┬─────────────────────────────┘
                │
                ▼

4️⃣ GENERATE OTP TOKEN
   ┌──────────────────────────────────┐
   │ Generate 6-digit random code     │
   │ Expiry: 10 minutes               │
   │ Create in database:              │
   │   VerificationToken table        │
   │ + User record (status: PENDING)  │
   └────────────┬─────────────────────┘
                │
                ▼

5️⃣ SEND EMAIL (CRITICAL!)
   ┌──────────────────────────────────────┐
   │ apps/web/src/lib/email.ts            │
   │                                      │
   │ sendOtp(email, otp)                  │
   │   ├─ Format HTML template            │
   │   ├─ Call Resend API                 │
   │   └─ Log in EmailLog table           │
   │                                      │
   │ ⚠️ This MUST work even if:          │
   │    - User already exists (just error)│
   │    - Rate limit hit (still send)     │
   │    - Bot detected (still send!)      │
   └────────────┬──────────────────────────┘
                │
                ▼

6️⃣ DATABASE UPDATES
   ┌────────────────────────────────┐
   │ Prisma ORM writes to database: │
   │                                │
   │ • User table:                  │
   │   ├─ email                     │
   │   ├─ username                  │
   │   ├─ password_hash (bcrypt)    │
   │   ├─ status: PENDING_VERIFY    │
   │   └─ created_at                │
   │                                │
   │ • VerificationToken table:     │
   │   ├─ email                     │
   │   ├─ token (OTP code)          │
   │   ├─ expires_at (10 min later) │
   │   └─ created_at                │
   │                                │
   │ • EmailLog table:              │
   │   ├─ email_to                  │
   │   ├─ email_type: OTP           │
   │   ├─ status: SENT              │
   │   └─ timestamp                 │
   └────────────┬────────────────────┘
                │
                ▼

7️⃣ RETURN SUCCESS
   ┌────────────────────────────────┐
   │ API Response:                  │
   │ Status: 200 OK                 │
   │ Message: "OTP sent to email"   │
   │                                │
   │ Frontend Redirect:             │
   │ → /auth/verify-email page      │
   └────────────┬────────────────────┘
                │
                ▼

8️⃣ OTP VERIFICATION
   ┌────────────────────────────────────────┐
   │ User receives email with OTP code      │
   │                                        │
   │ Frontend: OTP Input Component          │
   │ User enters 6-digit code               │
   │                                        │
   │ POST /api/auth/verify-email            │
   │   ├─ Check VerificationToken           │
   │   ├─ Compare OTP                       │
   │   ├─ Check not expired                 │
   │   ├─ Mark user VERIFIED                │
   │   ├─ Delete verification token         │
   │   └─ Create NextAuth session           │
   │                                        │
   │ Response: Success + JWT                │
   │ Redirect: /feed page                   │
   │ User is now LOGGED IN ✅               │
   └────────────────────────────────────────┘
```

### FLOW 2: REAL-TIME CHAT (WebSocket + Push Notifications)

```
┌──────────────────────────────────────────────────────────────┐
│         REAL-TIME GROUP CHAT FLOW (Web + Mobile)             │
└──────────────────────────────────────────────────────────────┘

1️⃣ USER OPENS CHAT PAGE
   ┌────────────────────────────────┐
   │ Web Browser or Mobile App      │
   │                                │
   │ Visit: /chat page              │
   │ Load: ChatComponent.tsx        │
   └────────────┬───────────────────┘
                │
                ▼

2️⃣ ESTABLISH WEBSOCKET CONNECTION
   ┌─────────────────────────────────────────┐
   │ apps/web/src/lib/socket.ts              │
   │ Socket.io Client Setup                  │
   │                                         │
   │ Connects to: apps/api (WebSocket Server)│
   │ URL: wss://your-api.com                 │
   │                                         │
   │ Joins namespace: /chat                  │
   │ Emits event: "user:join"                │
   │   ├─ userId                             │
   │   ├─ username                           │
   │   └─ timestamp                          │
   │                                         │
   │ ✅ Connection established               │
   │ Mark user as ONLINE                     │
   │ Update status in database               │
   └────────────┬────────────────────────────┘
                │
                ▼

3️⃣ USER TYPES & SENDS MESSAGE
   ┌──────────────────────────────────┐
   │ Frontend:                        │
   │ User types in message input      │
   │ Clicks "Send" button             │
   │                                  │
   │ Emit Socket event:               │
   │   event: "message:send"          │
   │   data: {                        │
   │     groupId: "group123"          │
   │     userId: "user456"            │
   │     text: "Hello everyone!",     │
   │     timestamp: now(),            │
   │     attachments: []              │
   │   }                              │
   └────────────┬─────────────────────┘
                │
                ▼

4️⃣ BACKEND RECEIVES & PROCESSES
   ┌──────────────────────────────────────┐
   │ apps/api/index.js (WebSocket Server)  │
   │                                      │
   │ Socket event handler receives data   │
   │                                      │
   │ 1. Validate message                  │
   │ 2. Save to database:                 │
   │    - Chat table (Prisma)             │
   │    - Message content                 │
   │    - Sender info                     │
   │    - Timestamp                       │
   │ 3. Get all users in group:           │
   │    - Find recipients                 │
   │    - Check who's online              │
   │ 4. Broadcast to online users         │
   │    - Emit to /chat namespace         │
   │    - Real-time delivery ✅           │
   │ 5. For offline users:                │
   │    - Trigger Firebase FCM            │
   │    - Send push notification          │
   └────────────┬──────────────────────────┘
                │
                ▼

5️⃣ BROADCAST TO ONLINE USERS
   ┌──────────────────────────────────────┐
   │ Socket.io Broadcast:                 │
   │                                      │
   │ socket.to(groupId).emit(              │
   │   "message:received",                │
   │   {                                  │
   │     id: msgId,                       │
   │     sender: {name, avatar},          │
   │     text: "Hello everyone!",         │
   │     timestamp,                       │
   │     read: false                      │
   │   }                                  │
   │ )                                    │
   │                                      │
   │ All connected users in that group    │
   │ receive message INSTANTLY ⚡          │
   └────────────┬──────────────────────────┘
                │
                ▼

6️⃣ FRONTEND DISPLAYS MESSAGE
   ┌───────────────────────────────────┐
   │ Socket listener receives message  │
   │                                   │
   │ socket.on("message:received",     │
   │   (msg) => {                      │
   │     // Add to message list        │
   │     // Scroll to bottom           │
   │     // Play notification sound    │
   │     // Mark as read               │
   │   }                               │
   │ )                                 │
   │                                   │
   │ Message appears in chat instantly │
   │ Both Web & Mobile see it          │
   │ ✅ Real-time chat working!        │
   └───────────────────────────────────┘

7️⃣ FOR OFFLINE USERS (Push Notification)
   ┌────────────────────────────────────────┐
   │ If recipient is OFFLINE:               │
   │                                        │
   │ Backend detects: User not connected    │
   │                                        │
   │ Trigger Firebase Cloud Messaging:      │
   │                                        │
   │ firebase.messaging.send({              │
   │   data: {                              │
   │     type: "new_message",               │
   │     groupId: "group123",               │
   │     senderName: "Raj",                 │
   │     preview: "Hello everyone!",        │
   │     timestamp: now()                   │
   │   },                                   │
   │   notification: {                      │
   │     title: "New message from Raj",     │
   │     body: "Hello everyone!",           │
   │     icon: "app_icon"                   │
   │   },                                   │
   │   tokens: [userDeviceTokens]           │
   │ })                                     │
   └────────────┬─────────────────────────────┘
                │
                ▼

8️⃣ ANDROID RECEIVES PUSH
   ┌──────────────────────────────────────┐
   │ Mobile Phone (Capacitor):             │
   │                                      │
   │ @capacitor/push-notifications        │
   │ receives Firebase message             │
   │                                      │
   │ Android System triggers:              │
   │ ├─ Notification banner               │
   │ ├─ Sound alert                       │
   │ ├─ Vibration                         │
   │ └─ Lock screen notification          │
   │                                      │
   │ User taps notification:               │
   │ → App opens                          │
   │ → Shows message in chat              │
   │ → Message marked as read ✅          │
   └──────────────────────────────────────┘
```

### FLOW 3: MEDIA UPLOAD (Camera + Cloudinary)

```
┌────────────────────────────────────────────────────┐
│    MEDIA UPLOAD FLOW (Web Input vs Mobile Camera)  │
└────────────────────────────────────────────────────┘

WEB APP:
─────────

1. User clicks "Upload Image"
   ↓
2. HTML5 file picker opens
   ↓
3. User selects file from computer
   ↓
4. frontend code reads file
   ↓
5. Direct upload to Cloudinary API
   ├─ File → Cloudinary CDN
   ├─ Returns: image URL
   └─ Save URL in database
   ↓
6. Display image in post ✅


MOBILE APP (Capacitor):
──────────────────────

1. User clicks "Take Photo" or "Upload"
   ↓
2. @capacitor/camera plugin triggered
   ├─ Native permission check:
   │  ├─ CAMERA permission
   │  ├─ PHOTO_LIBRARY permission
   │  ├─ Requested in AndroidManifest.xml
   │  └─ User approves on first use
   ├─ Native camera app opens
   │  (or photo gallery)
   ├─ User takes photo / selects image
   └─ Returns image data as base64
   ↓
3. Base64 image sent to backend
   POST /api/upload
   ├─ Send base64 data
   ├─ Backend receives
   ├─ Convert to file
   └─ Upload to Cloudinary
   ↓
4. Cloudinary returns URL
   ↓
5. Save URL in database
   ↓
6. Display in app ✅


BOTH PATHS CONVERGE AT:
──────────────────────

apps/web/src/lib/cloudinary.ts
├─ Upload function
├─ Handles both web & mobile
├─ API key management
└─ Returns image URL

Database (Prisma):
├─ Post table stores:
│  ├─ image_url (from Cloudinary)
│  ├─ created_by
│  └─ created_at
└─ Accessible from both web & mobile

Display:
├─ Web: <img src={imageUrl} />
├─ Mobile: Same component ✅
└─ CDN serves fast everywhere
```

---

## 🗂️ YOUR FOLDER STRUCTURE EXPLAINED

```
project-root/
│
├── 🚀 apps/web/                    ← MAIN FRONTEND (Web + Mobile)
│   ├── src/
│   │   ├── app/                    ← Next.js App Router (File-based)
│   │   │   ├── (auth)/            ← Auth group
│   │   │   │   ├── signup/        
│   │   │   │   │   └── page.tsx    ← /signup page + form
│   │   │   │   ├── signin/
│   │   │   │   └── verify-email/
│   │   │   │
│   │   │   ├── api/               ← API ROUTES (CRITICAL!)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── register/
│   │   │   │   │   │   └── route.ts ← SIGNUP ENDPOINT
│   │   │   │   │   ├── signin/
│   │   │   │   │   └── verify-email/
│   │   │   │   │       └── route.ts ← OTP VERIFY
│   │   │   │   └── upload/
│   │   │   │       └── route.ts    ← Media upload handler
│   │   │   │
│   │   │   ├── feed/              ← /feed page (main content)
│   │   │   ├── chat/              ← /chat page (real-time)
│   │   │   ├── discover/          ← /discover page (groups)
│   │   │   ├── profile/           ← /profile page
│   │   │   ├── layout.tsx         ← Root layout (Header + Sidebar)
│   │   │   └── page.tsx           ← / home page
│   │   │
│   │   ├── components/            ← Reusable UI Components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── BottomNav.tsx (mobile nav)
│   │   │   ├── auth/
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   ├── SigninForm.tsx
│   │   │   │   └── OtpInput.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   └── MessageInput.tsx
│   │   │   ├── post/
│   │   │   └── common/
│   │   │
│   │   ├── actions/              ← SERVER ACTIONS (Prisma queries)
│   │   │   ├── post.ts
│   │   │   ├── chat.ts
│   │   │   ├── user.ts
│   │   │   └── community.ts
│   │   │
│   │   ├── lib/                  ← CORE LIBRARIES
│   │   │   ├── email.ts          ← Resend email service
│   │   │   ├── socket.ts         ← Socket.io client setup
│   │   │   ├── prisma.ts         ← Database client
│   │   │   ├── cloudinary.ts     ← File upload handler
│   │   │   ├── auth.ts           ← NextAuth configuration
│   │   │   ├── validation.ts     ← Input validation
│   │   │   ├── botDetection.ts   ← Bot/spam detection
│   │   │   ├── rate-limit.ts     ← Rate limiting logic
│   │   │   └── firebase.ts       ← FCM push setup
│   │   │
│   │   ├── middleware.ts         ← NextAuth + Rate limit
│   │   ├── env.ts                ← Environment variables
│   │   └── types/                ← TypeScript types
│   │
│   ├── android/                  ← Capacitor Android configs
│   │   ├── app/src/
│   │   │   └── AndroidManifest.xml ← Permissions!
│   │   └── build/                ← APK output
│   │
│   ├── capacitor.config.json     ← MOBILE CONFIG
│   │   ├── appId: "com.tolee.app"
│   │   ├── server: { url: "https://tolee.in" }
│   │   └─ plugins: camera, push-notifications, etc.
│   │
│   ├── .env.local               ← Secrets (gitignored)
│   ├── .env.example             ← Template
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
│
├── 💬 apps/api/                 ← WEBSOCKET BACKEND
│   ├── index.js                 ← Main Socket.io server
│   │   ├── Express server setup
│   │   ├── Socket.io namespace: /chat
│   │   ├── Message handlers
│   │   ├── Broadcast logic
│   │   ├── Firebase FCM trigger
│   │   └── User online/offline tracking
│   │
│   ├── package.json
│   └── README.md
│
├── 📦 packages/shared/          ← Shared Code
│   ├── types.ts                 ← Common interfaces
│   ├── utils.ts                 ← Helper functions
│   └── constants.ts             ← Constants
│
├── 🗄️ prisma/                   ← DATABASE SCHEMA
│   ├── schema.prisma            ← Database models
│   │   ├── User
│   │   ├── VerificationToken
│   │   ├── EmailLog
│   │   ├── Chat
│   │   ├── Post
│   │   ├── Comment
│   │   └── Community
│   │
│   └── migrations/              ← Schema versions
│
├── docker-compose.yml           ← Local dev services
├── .env.example                 ← Template
├── .env.local                   ← Your secrets
├── .env.production              ← Production secrets
├── pnpm-workspace.yaml          ← Monorepo config
└── package.json                 ← Root config
