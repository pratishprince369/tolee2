# Tolee Project Context

## Overview
**Tolee** is a social platform built on the concept of groups (Tolees). Every post must belong to a Tolee.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TailwindCSS, Shadcn UI, Lucide React.
- **Backend/API**: Next.js Route Handlers.
- **Database**: PostgreSQL (Neon) with Prisma ORM.
- **Storage**: Firebase Storage.
- **Auth**: NextAuth.js.

## Directory Structure
- `apps/web`: Main Next.js application.
  - `src/app/u/[username]`: User profile pages.
  - `src/app/t/[slug]`: Tolee (group) pages.
  - `src/app/api/upload`: Image upload handler (Firebase).
  - `src/components`: UI components (ProfileHeaderCard, EditProfileModal, etc.).
- `apps/api`: Express backend (for real-time features like Socket.io).

## Recent Tasks & Progress
- [x] Initialized local development server on http://localhost:3000.
- [x] Fixed non-responsive camera buttons on the profile page by adjusting z-indexes in `ProfileHeaderCard.tsx`.
- [x] Optimized `/api/upload` to handle `ArrayBuffer` directly for better compatibility with cropped images.
- [x] Added `window.location.reload()` after profile updates to ensure the UI reflects the new images immediately.

## Known Issues
- [ ] Image upload sometimes returns `storage/unknown` error from Firebase if the bucket or permissions are not perfectly aligned (added detailed logging to debug).

## Next Steps
- [ ] Implement APK generation using Capacitor or convert the project into a PWA.
- [ ] Finalize real-time chat features in `apps/api`.
- [ ] Enhance AI moderation for posts.
