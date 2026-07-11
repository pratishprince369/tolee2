# 🧠 TOLEE CORE BRAIN - CODEBASE MEMORY & DEVELOPMENT RULES

This file is the single source of truth for AI agents and developers working on the Tolee project. **Read this file before making any changes** to ensure you do not break existing functionality, introduce compiler/runtime errors (like Next.js circular dependency errors), or overwrite previous features.

---

## 🚫 CRITICAL DEVELOPMENT RULES (NEVER VIOLATE)

### Rule 1: No Circular Server Action Imports
Next.js client-side bundles (e.g., chunk `2117`) will **fail at runtime with a ReferenceError** (e.g., `Cannot access 'ev' before initialization`) if any client component imports from a Server Action file that imports from other Server Action files.
* **DO NOT** import `@/actions/tolee`, `@/actions/post`, or `@/actions/story` inside Client Components if they have dependency loops.
* Keep all files in `apps/web/src/actions/` completely independent of each other (i.e. **NO** action file should ever import from another action file).
* If action `A` needs logic from action `B`, refactor the shared database queries into a common service file in `@/lib/` or inline the Prisma queries directly.
* If a client page (like `/chat`, `/feed`, `/reels`) needs to trigger actions that depend on complex multi-action graphs, use a **dedicated REST API route** (e.g., `/api/tolee/mute`, `/api/story/reply`) instead of importing Server Actions directly.

### Rule 2: Keep Service Worker Safe
The Service Worker (`sw.js`) in `apps/web/public/sw.js` must **ONLY** intercept static assets (images, fonts, styles, scripts) and the root page `/`.
* **DO NOT** let it intercept dynamic routes (e.g., `/chat`, `/feed`, `/reels`, `/api/*`, `/_next/*`).
* Returning `undefined` inside `event.respondWith()` crashes the Service Worker and breaks client-side routing. Keep the bypass rules intact.

---

## 📌 FEATURE COMPONENT DIRECTORY MAP

### 1. Group Chat Navigation & Membership Verification
* **Path**: `apps/web/src/app/chat/page.tsx`
* **Workflow**: When query params `toleeId` or `chatId` change, `page.tsx` automatically shifts the active chat view.
* **Rules**:
  - Non-members trying to view a group chat are displayed a `Join Group` screen instead of the messages list.
  - Sidebar highlights the correct category (Groups vs Personal) matching the selection.

### 2. Video Post Availability & Sharing
* **Path**: `apps/web/src/actions/post.ts` (sharing logic) & `apps/web/src/app/chat/page.tsx` (cards display).
* **Media Handling**:
  - Supports both Cloudinary video storage and Mux playback asset URLs.
  - Video thumbnails are automatically derived using `getMediaThumbnail` or `image.mux.com` playback IDs.

### 3. News Article Redirection
* **Path**: `apps/web/src/app/news/[slug]/page.tsx`
* **Workflow**: News articles are rendered as Premium Articles. Deep links from chat dynamically route users directly to the correct slug, falling back to ID if necessary.

### 4. Onboarding Notifications
* **Path**: `apps/web/src/app/api/auth/register/route.ts` & `apps/web/src/lib/auth.ts`
* **Workflow**: Inserts a `welcome` onboarding notification to Neon database exactly at the moment of signup, preventing existing user notification duplication.

---

## 📝 RECENT CHANGES REGISTER (LOG ALL UPDATES HERE)
*(Add any new function or feature implemented to this list to keep memory alive for future sessions)*

- **2026-07-11**: Decoupled `actions/story.ts` and `StoryViewer.tsx` from `actions/chat.ts` by introducing POST endpoint `/api/story/reply` to prevent runtime ReferenceErrors on `/feed` and `/chat`.
- **2026-07-11**: Decoupled `chat/page.tsx` from `@/actions/tolee` and `@/actions/post` by creating endpoints `/api/tolee/mute`, `/api/tolee/leave`, and `/api/post/check-availability`.
- **2026-07-11**: Refactored Service Worker `sw.js` to only intercept static files and root page `/`, resolving fetch-event response TypeErrors on navigations.
- **2026-07-11**: Resolved Group Chat navigation and personal chat sharing deep links to correct page targets.
