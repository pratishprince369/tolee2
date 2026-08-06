# Tolee Brand Search & Google Sitelinks Optimization (brain.md)

## Objective
Ensure that searching the exact brand keyword `"tolee"` on Google displays:
1. **#1 Rank for Tolee Website** (`https://www.tolee.in`) ahead of generic koala/animation characters.
2. **Google Sitelinks** directly beneath the main result linking to core sections:
   - **Tolee Home** (`https://www.tolee.in`)
   - **Tolee Reels** (`https://www.tolee.in/reels`)
   - **Tolee Marketplace** (`https://www.tolee.in/marketplace`)
   - **Tolee Screen** (`https://www.tolee.in/screen`)
   - **Tolee Discover Groups** (`https://www.tolee.in/discover`)
   - **Tolee World** (`https://www.tolee.in/world`)
   - **Tolee Creator Program** (`https://www.tolee.in/creator-program`)

---

## Technical Audit & Enhancements Implemented

### 1. Root Layout Metadata & JSON-LD Schemas (`apps/web/src/app/layout.tsx`)
- Added `metadataBase: new URL("https://www.tolee.in")`.
- Enhanced `title` template (`title: { default: "Tolee | Discover Local Communities, Reels & Marketplace", template: "%s | Tolee" }`).
- Added targeted brand keywords: `["Tolee", "Tolee App", "Tolee India", "Tolee Communities", "Tolee Marketplace", "Tolee Reels", "Tolee Screen", "Tolee AI", "Tolee Groups", "Tolee World"]`.
- Configured Open Graph (`og:site_name`, `og:type`, `og:title`, `og:description`, `og:image`, `og:url`).
- Configured Twitter Card metadata (`summary_large_image`).
- Added 3 JSON-LD Schema.org Structured Data scripts in `<head>`:
  - **`Organization` Schema**: Defines Tolee as an official organization with Play Store link and brand logo.
  - **`WebSite` Schema**: Enables Sitelinks Search Box for Google.
  - **`SiteNavigationElement` / `ItemList` Schema**: Explicitly maps the 7 main sitelink sections (Home, Reels, Marketplace, Screen, Discover, World, Creator Program) so Google generates sitelinks under `"tolee"`.

### 2. Dedicated Section Layouts & Metadata
Created dedicated `layout.tsx` files with explicit page titles, meta descriptions, and OpenGraph parameters:
- `apps/web/src/app/reels/layout.tsx` (Tolee Reels | Watch Trending Short Video Reels)
- `apps/web/src/app/marketplace/layout.tsx` (Tolee Marketplace | Buy & Sell Local Products & Services)
- `apps/web/src/app/screen/layout.tsx` (Tolee Screen | Stream Videos & Live Masterclasses)
- `apps/web/src/app/discover/layout.tsx` (Tolee Discover | Find & Join Local Interest Groups)
- `apps/web/src/app/world/layout.tsx` (Tolee World | Create AI Micro-Websites, Stores & Blogs)
- `apps/web/src/app/news/layout.tsx` (Tolee News | Latest Local Community News & Updates)
- `apps/web/src/app/creator-program/layout.tsx` (Tolee Creator Program | Monetize Content & Earn)

---

## Git Commit & Push Summary
- All changes tested with `npx tsc --noEmit` cleanly.
- Saved to project root `brain.md`.
- Staged and committed to `main` branch.
