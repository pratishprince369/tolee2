# Tolee Mobile Web App & Voice AI Manager Architecture (MOBILE_BRAIN.md)

## 📌 Mobile App Specification
This document serves as the master intelligence file for Tolee's Mobile Web App and PWA (Progressive Web Application). It outlines all mobile-specific features, touch UI controls, voice engine fallbacks, and multi-lingual AI configurations.

---

## 📱 Mobile App Core Features & Specifications

### 1. Viewport & Touch UI Optimization
- **Layout**: Fully responsive layouts optimized for mobile screens (`320px` to `768px`).
- **Touch Controls**: Minimum touch target size of 44x44px for buttons, chips, and mic toggles.
- **Bottom Navigation Safe Zone**: Floating HUDs and docks are anchored at `bottom-24` (`bottom: 6rem`) to prevent overlap with bottom navigation bars or keyboard popups.

### 2. Mobile Voice AI Manager Engine (`src/modules/tolee-ai-manager/VoiceCompanion`)
- **Web Speech API & Audio Unlock**:
  - `unlockMobileAudio()` initializes SpeechSynthesis and Web Audio API context during user touch/click events to bypass iOS Safari and Android Chrome auto-play restrictions.
- **Mobile Mic Recognition**:
  - On mobile screen viewports (`window.innerWidth < 768`), `recognition.continuous` is set to `false`. Single-shot voice burst mode prevents packet drops and silent Chrome Android crashes.
- **HTML5 Fallback TTS Engine**:
  - If `SpeechSynthesis` fails or is un-supported on the mobile device, `fallbackAudioSpeak` triggers an HTML5 Web Audio TTS stream ensuring audio response output on all mobile speakers.
- **Floating HUD (`FloatingVoiceHUD.tsx`)**:
  - Displays **"Tap Mic 🎙️"** prompt with glowing pulse effect.
  - Shows real-time speech text `"🎙️ Listening... Speak your command!"` and live transcript.
  - Speaks out clean AI response text (stripping markdown syntax like `*`, `#`, `_`) in mature Hindi/English voice.

### 3. Mobile Feed & News Stream (News ➔ Video ➔ News ➔ Video)
- **Alternating Pattern**: Every news post card is followed by an HD video card (YouTube Shorts or Coverr 1080p MP4 reel).
- **Posting Timestamps**: Displays post timing alongside date (`Date | 4:00 pm`).
- **Deduplication**: Filters out duplicate post IDs and matching headline keys.

### 4. 6 Registered Automated User Accounts
1. `@adsvia` (`adsvidia369@gmail.com`) - Tech & AI, Space/NASA, Coverr Coding videos
2. `@suman_kumar` (`loktimes369@gmail.com`) - India & Marathi Affairs, Discovery Documentaries
3. `@updatesontimes` (`updatesontimes@gmail.com`) - Business & Finance, Podcasts
4. `@vsdapav` (`vadapavwaledada@gmail.com`) - Food, Recipes & Coverr Shakshuka videos
5. `@rinku_sharma` (`rinkugupta90282@gmail.com`) - Sports & Cricket Highlights, Cartoons
6. `@scroll_on` (`foodpaass@gmail.com`) - Stock Market, Sensex/Nifty, Crypto (Finnhub API)

---

## 🛠️ Developer & AI Agent Directive for Mobile
When adding new mobile features:
1. Always preserve `unlockMobileAudio()` in touch handlers.
2. Maintain mobile viewport z-indexes (`z-[99999]`) and safe-bottom padding.
3. Test touch events (`onClick`, `onTouchEnd`) without double triggers.
4. Ensure feed interleaving (News ➔ Video ➔ News ➔ Video) is preserved on mobile feeds.
