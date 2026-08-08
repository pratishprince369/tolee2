# Tolee Master Intelligence & Architecture Brain (brain.md)

## 📌 Project Overview
**Tolee** is an enterprise-grade AI-powered social news & community ecosystem built on Next.js 14 (App Router), PostgreSQL, Prisma ORM, and TailwindCSS. It includes 24/7 AI Manager Employees, multi-lingual automated news & HD video publishing across 6 accounts, live stock market updates, YouTube Data API v3 & Coverr.co video streams, PWA mobile web app support, and a Mobile-Optimized Voice AI Manager.

---

## 🤖 6 Automated News & Video Publishing Accounts
All automated news and HD video posts are published under 6 registered user accounts:

1. **`adsvidia369@gmail.com` (`@adsvia`)**
   - *Niche*: Tech & AI, NASA Space, Quantum Computing, Coverr Coding videos
   - *Language*: English (`en-IN`)

2. **`loktimes369@gmail.com` (`@suman_kumar`)**
   - *Niche*: India & Maharashtra Regional Affairs, Discovery Wildlife Documentaries
   - *Language*: Hindi & Marathi (`hi-IN`, `mr-IN`)

3. **`updatesontimes@gmail.com` (`@updatesontimes`)**
   - *Niche*: Business, Finance, Global Economy, Business Podcasts
   - *Language*: English (`en-IN`)

4. **`vadapavwaledada@gmail.com` (`@vsdapav`)**
   - *Niche*: Food, Cooking Recipes, Lifestyle, Coverr Shakshuka HD videos
   - *Language*: Hindi & English (`hi-IN`, `en-IN`)

5. **`rinkugupta90282@gmail.com` (`@rinku_sharma`)**
   - *Niche*: Sports, Cricket Highlights, Cartoons & Comedy Videos
   - *Language*: Hindi & English (`hi-IN`, `en-IN`)

6. **`foodpaass@gmail.com` (`@scroll_on`)**
   - *Niche*: Stock Market, Sensex/Nifty, Crypto, Finnhub Financial News
   - *Language*: English & Hindi (`en-IN`, `hi-IN`)

---

## 🔑 Integrated APIs & Verified Credentials
- **Coverr.co API**: `COVERR_API_KEY="7629199d2c18c260036aa0ea792088f8"` (1080p MP4 stock video streams)
- **Finnhub Financial News API**: `FINNHUB_API_KEY="d9r5t99r01qnlhcli2ngd9r5t99r01qnlhcli2o0"` (Live stock news)
- **YouTube Data API v3**: `YOUTUBE_API_KEY="AIzaSyAQGEjKb5EkJjZSSh4I4X5x2zhESnhSzH0"` (NASA, Discovery, Cartoons, Comedy)
- **GNews & NewsData APIs**: Multi-lingual RSS and news feeds
- **NVIDIA Llama 3 70B & Flux AI**: Content moderation, news expansion, and DSLR visual generation

---

## ⚡ Core Automated Posting & Feed Rules

### 1. Volume Target & Human-like Time Gaps
- **Target**: 10 News Posts + 10 Video Posts daily (Total 20 posts/day).
- **Time Gap**: 10 to 25 minutes randomized human time gaps between batch posts.

### 2. Alternating Feed Stream Pattern (News ➔ Video ➔ News ➔ Video)
- Implemented across `/feed`, `/news`, and Tolee Group pages (`/t/[slug]`).
- Every news article is strictly followed by an HD video post (YouTube Shorts or Coverr 1080p MP4 video).

### 3. All Tolee Groups Link Auto-Assignment
- When any post is created by the 6 accounts in `newsAutoPublisher.ts`, `youtubeAutoPublisher.ts`, or `coverrAutoPublisher.ts`, it is automatically linked to **all 32 active Tolee groups** (`tolees: { create: allTolees.map(t => ({ toleeId: t.id })) }`).
- Guaranteed: Visiting any group (`/t/[slug]`) displays real non-simulated API news and video posts.

### 4. Cross-Account Global Deduplication
- **Database Level**: Title/headline matching across ALL accounts guarantees that 2 different accounts will NEVER post the same news article or video.
- **Client Stream Level**: Deduplicates matching post IDs and normalized headline keys.

### 5. Timestamp Display Format
- All feed cards show exact posting time alongside date: `Date | 4:00 pm` or `Formatted Date | 12:30 pm`.

---

## 📱 Mobile App & Mobile Voice AI Manager Architecture

### 1. Progressive Web App (PWA) & Responsive Mobile Web
- Configured via `next.config.js` and viewport meta tags for native-like performance on iOS Safari and Android Chrome.

### 2. Mobile Voice AI Manager (`src/modules/tolee-ai-manager`)
- **Dual Engine**: `webkitSpeechRecognition` + HTML5 Audio / SpeechSynthesis fallback.
- **Audio Unlock**: `unlockMobileAudio()` unlocks Web Audio Context and SpeechSynthesis on user tap bypass.
- **Adaptive Mic Mode**: `recognition.continuous = false` on mobile viewports (`window.innerWidth < 768`) prevents speech packet drops and Chrome Android crashes.
- **Floating HUD**: Positioned at `fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-[99999]` with glowing **"Tap Mic 🎙️"** button, soundwave equalizer animation, and mature Hindi/English voice output.

---

## 🗄️ Database & Schema Stack
- **Database**: PostgreSQL
- **ORM**: Prisma ORM (`prisma-client-js`)
- **Schema File**: [`apps/web/prisma/schema.prisma`](file:///c:/Users/ASUS/Desktop/miracle/tolee/apps/web/prisma/schema.prisma)

---

## 🚀 AI Agent Future Directive
Whenever starting a new turn or feature update:
1. Read `brain.md` and `apps/web/MOBILE_BRAIN.md` to preserve all 6 accounts, API keys, news-video interleaving pattern, group linking, and mobile voice manager fixes.
2. Ensure no duplicate posts are created.
3. Test all mobile viewport layouts (`max-w-sm`, touch buttons, audio unlocks).
