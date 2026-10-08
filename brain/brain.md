# TOLEE MASTER SYSTEM BRAIN (MASTER CONTEXT)

## 1. Product Overview
**Tolee** is a comprehensive, hyper-local Indian community social network, personal AI operating layer, and creator monetization platform.
- **Mission**: Connect local communities, discover nearby radar events/food/deals, share stories, posts, reels (shoots), chat in real time, listen to Tolee Songs, and provide a 24x7 Personal AI Agent that operates the app on behalf of the user.
- **Core Personas**: Everyday social users, local residents, creators, shopkeepers/merchants, and advertisers.

---

## 2. Architecture & Stack
- **Monorepo / Web Framework**: Next.js 14 App Router (`apps/web`), React 18, Tailwind CSS, TypeScript.
- **Backend / APIs**: Next.js Server Actions (`apps/web/src/actions/*`), API Routes (`apps/web/src/app/api/*`).
- **Database & ORM**: PostgreSQL with Prisma ORM (`apps/web/prisma/schema.prisma`).
- **Authentication**: NextAuth.js (`apps/web/src/lib/auth.ts`) with Session/JWT support.
- **Media & File Storage**: Cloudinary integration for image & video assets (`apps/web/src/lib/cloudinary.ts`).
- **Realtime Services**: WebSockets / Pusher / Polling for chat messages and live notifications.

---

## 3. Tolee Super AI Personal Agent Architecture
The Tolee AI Manager operates as an autonomous personal digital employee.
```text
                    USER
                      │
             Voice / Text / Media
                      │
                      ▼
             TOLEE AI MANAGER
                      │
                      ▼
             Intent Understanding
                      │
                      ▼
              Agent Orchestrator
                      │
              ┌───────┴────────┐
              │                │
        Task Planner      Permission Engine
              │                │
              └───────┬────────┘
                      │
                 TOOL ROUTER
                      │
     ┌────────────────┼─────────────────┐
     │                │                 │
     ▼                ▼                 ▼
Tolee Tools      External Tools    Internet Tools
(Messages, Feed,  (Email, Calendar, (Agent-Reach,
 Posts, Groups,    Maps, WhatsApp)   Live Web Search)
 Ads, Songs)          │                 │
                      ▼                 ▼
               EXECUTION ENGINE
                      │
             ┌────────┴────────┐
             ▼                 ▼
           TEXT              VOICE
             │                 │
             └────────┬────────┘
                      ▼
                    USER
```

---

## 4. Central Tool Registry (`ToolRegistry`)
### Tolee Core Tools:
- `get_user_profile`: Real profile statistics, bio, verification status.
- `get_user_groups`: Communities joined and created.
- `get_notifications`: Real unread and recent notifications.
- `get_user_posts` / `create_tolee_post`: Social feed queries and publishing.
- `get_latest_messages` / `send_chat_message`: Real-time chat integration.
- `get_radar_alerts`: Hyperlocal neighborhood alerts, food, and deals.
- `get_wallet_balance`: Real coin and promo credit balances.
- `tolee_songs_control`: Play, search, pause, resume, and queue tracks on Tolee Music.
- `tolee_ads_manager`: Campaign planning, budget estimation, and performance audits.

### Productivity & Communication Tools:
- `email_assistant`: Read unread emails, compose drafts, send with confirmation.
- `calendar_assistant`: Check agenda, schedule meetings, resolve conflicts.
- `whatsapp_assistant`: Query connected WhatsApp messages, draft and send replies.

### Internet & Agent-Reach Tools:
- `live_web_search`: Real-time multi-source web grounding (DuckDuckGo + Wikipedia).
- `agent_reach_connector`: Multi-platform web reader (Websites, YouTube, GitHub, Reddit, Socials).
- `shopping_finder`: Compare products, prices, and specifications under budgets.

---

## 5. Security, Permissions & Non-Negotiable Rules
1. **Never Simulate Reality**: AI never invents user counts, fake messages, or completed actions. Every action requires a verified backend receipt before saying "Done".
2. **Action Confirmation**: Risky actions (send email, send WhatsApp, publish post, spend money, delete content) require explicit confirmation preview.
3. **Data Isolation**: Secrets, API keys, and session tokens are strictly server-side and never exposed to the frontend or written into brain markdown files.
