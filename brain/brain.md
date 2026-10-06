# TOLEE MASTER SYSTEM BRAIN (MASTER CONTEXT)

## 1. Product Overview
**Tolee** is a comprehensive, hyper-local Indian community social network and creator monetization platform.
- **Tagline / Mission**: Connect local communities, discover nearby radar events/food/deals, share stories, posts, reels (shoots), chat in real time, and empower creators and local commerce.
- **Core Personas**: Everyday social users, local community members, creators, local business owners, advertisers.

---

## 2. Architecture & Stack
- **Monorepo / Web Framework**: Next.js 14 App Router (`apps/web`), React 18, Tailwind CSS, TypeScript.
- **Backend / APIs**: Next.js Server Actions (`apps/web/src/actions/*`), API Routes (`apps/web/src/app/api/*`).
- **Database & ORM**: PostgreSQL with Prisma ORM (`apps/web/prisma/schema.prisma`).
- **Authentication**: NextAuth.js (`apps/web/src/lib/auth.ts`) with Session/JWT support.
- **Media & File Storage**: Cloudinary integration for image & video assets (`apps/web/src/lib/cloudinary.ts`).
- **Realtime Services**: WebSockets / Pusher / Polling for chat messages and live notifications.

---

## 3. Existing Tolee AI Manager Architecture
The Tolee AI Manager functions as the 24x7 Digital Employee and AI Co-pilot for the user.

### Current Flow:
1. **User Interface**: `apps/web/src/modules/tolee-ai-manager/Dashboard/AIDashboard.tsx`
   - Handles text chat, voice notes, media attachments, reminders, tasks, and creator earnings.
2. **Server Action Entry Point**: `processAIPersonalMessage` in `apps/web/src/actions/ai-manager.ts`
   - Resolves authenticated session (`userId`, `email`).
   - Delegates to `CentralAIEngine.execute(...)`.
3. **Execution Pipeline**: `CentralAIEngine` (`apps/web/src/lib/ai-gateway/central-engine.ts`)
   - Evaluates intents: Time/Date, Image generation (Pollinations/Flux), Document Analysis, Platform Actions (`executeToleeAIAction`).
   - Routes to AI providers: FreeLLMAPI, NVIDIA NIM, Google Gemini, Groq, OpenAI.
4. **Agent Orchestration**: `AgentOrchestrator` (`apps/web/src/modules/tolee-ai-agent/core/agent-orchestrator.ts`)
   - Equipped with `ToolRegistry` (`apps/web/src/modules/tolee-ai-agent/tools/registry.ts`).
   - Multi-round tool execution loop: LLM prompt -> function call -> execute in DB -> follow-up conversational response.

---

## 4. AI Providers & Model Routing
1. **NVIDIA NIM Frontier Cluster**:
   - Primary high-performance enterprise inference (`https://integrate.api.nvidia.com/v1/chat/completions`).
   - Models: `meta/llama-3.2-11b-vision-instruct`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, `nvidia/nemotron-3-super-120b-a12b`.
2. **FreeLLMAPI Unified Gateway** (`https://github.com/tashfeenahmed/freellmapi`):
   - OpenAI-compatible gateway across multiple free provider tiers.
   - Dynamic routing (`auto`, `auto:fast`, `auto:smart`).
   - Providers bundled: Groq, Cerebras, OpenRouter, Pollinations, DeepSeek, Qwen.
3. **Google Gemini**:
   - Multimodal and long-context processing (`gemini-2.0-flash`, `gemini-1.5-pro`).
4. **Autonomous Local Brain**:
   - Deterministic calculations, regex validations, and zero-fail local fallbacks.

---

## 5. Tool Registry & Real Tolee Capabilities
### Read Tools (Safe / No side effects):
- `get_user_profile`: Fetches user profile, follower counts, verified status, bio.
- `get_user_groups`: Queries `ToleeMember` and `Tolee` tables for communities joined or created.
- `get_notifications`: Queries `Notification` table for unread and recent alerts.
- `get_user_posts`: Queries `Post` table with like/comment counts.
- `get_latest_messages`: Queries `Message` table with sender details.
- `get_stories`: Queries active `Story` table for user's own or friends' active stories.
- `get_marketplace_enquiries`: Queries `Listing` table for active products and buyer interest.
- `get_radar_alerts`: Queries `RadarPost` table for neighborhood alerts, food, news, and deals.
- `get_wallet_balance`: Queries `CreditWallet` for earned coins/INR balance.
- `get_daily_schedule`: Queries `AITask` and `AIReminder` for pending to-dos and alarms.

### Write Tools (Require execution verification & receipts):
- `create_tolee_post`: Creates and publishes real social post to DB (`Post` table).
- `send_chat_message`: Creates and delivers message in real chat conversation (`Message` table).
- `create_ai_reminder`: Creates real scheduled alarm in `AIReminder` table.
- `create_ai_task`: Creates real to-do item in `AITask` table.
- `like_tolee_post`: Creates real like in `Like` table.
- `comment_tolee_post`: Creates real comment in `Comment` table.
- `delete_tolee_post`: Safely deletes user's own post after verifying ownership.

---

## 6. Anti-Hallucination & Reality Validation ("Golden Rule")
### **Golden Rule: Never Simulate Reality.**
- The AI must **never** invent Tolee-specific data (e.g. fake group counts, fake followers, fake unread messages).
- When a user asks about their Tolee data, the system **MUST** invoke the corresponding tool first.
- If data is empty: state clearly that none was found (e.g. "Aapke paas koi naya notification nahi hai").
- When a user requests an action (publish, send, delete): the action **MUST** be executed on the real database first, produce an Action Receipt, and only then confirm to the user. If execution fails, report the error honestly.

---

## 7. Known Issues & Upgrades
- **Previous limitation**: Generic fallback text or heuristic draft returns without verifying DB state.
- **Fixed in this upgrade**:
  - Direct integration between `CentralAIEngine`, `AgentOrchestrator`, and `ToolRegistry`.
  - Added `ToleeRealityValidator` to verify that factual claims match real tool receipts.
  - Schema alignment for all tools (e.g. `Message` sender/chat models, `RadarPost`, `Story`, `CreditWallet`).

---

## 8. Architectural Decisions Log
- **ADR-001 (Preserve Existing UI & NVIDIA)**: Keep `AIDashboard.tsx` UI and existing NVIDIA NIM integration intact; augment with FreeLLMAPI and Tool Calling.
- **ADR-002 (Single Source of Truth for Reality)**: Any statement about user's data or state must originate from Prisma ORM via dedicated tools.
- **ADR-003 (Receipt Verification)**: Actions return a verified receipt ID before the AI says "Done".
