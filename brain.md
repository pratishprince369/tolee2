# Tolee Brand Search & Google Sitelinks Optimization (brain.md)

## Objective
Replicate the **Facebook-style Expanded Google Sitelinks Layout** when users search `"tolee"` on Google:

### Target Layout on Google Search:
```text
Tolee - Discover Local Communities, Reels & Marketplace
https://www.tolee.in

Tolee Reels
Watch trending short vertical video reels...

Tolee Marketplace
Buy & sell local products & services with 0% commission...

Tolee Screen
Stream high-quality videos & live masterclasses...

Tolee Discover Groups
Find & join verified local community groups...

Tolee World
Create AI micro-websites, online stores & blogs...

Tolee Creator Program
Monetize content & build subscription communities...

More results from tolee.in »
--------------------------------------------------
Google Play Store: Tolee - Apps on Google Play
```

---

## Technical Architecture Implemented

### 1. Root Layout Metadata & JSON-LD Schemas (`apps/web/src/app/layout.tsx`)
- `metadataBase`: `https://www.tolee.in`
- `title`: `{ default: "Tolee | Discover Local Communities, Reels & Marketplace", template: "%s | Tolee" }`
- Brand Keywords: `["Tolee", "Tolee App", "Tolee India", "Tolee Communities", "Tolee Marketplace", "Tolee Reels", "Tolee Screen", "Tolee AI", "Tolee Groups", "Tolee World"]`
- Injected 3 JSON-LD Schema Scripts:
  - **`Organization` Schema**: Defines Tolee brand entity with official logo & Play Store link.
  - **`WebSite` Schema**: Triggers Sitelinks Searchbox.
  - **`SiteNavigationElement` / `ItemList` Schema**: Signals the 7 primary sub-pages to Google for rendering the 2-column Sitelinks layout (Home, Reels, Marketplace, Screen, Discover, World, Creator Program).

### 2. Sub-Route Dedicated Metadata & Navigation
Created dedicated layout files with unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, and OpenGraph tags:
- `apps/web/src/app/reels/layout.tsx`
- `apps/web/src/app/marketplace/layout.tsx`
- `apps/web/src/app/screen/layout.tsx`
- `apps/web/src/app/discover/layout.tsx`
- `apps/web/src/app/world/layout.tsx`
- `apps/web/src/app/news/layout.tsx`
- `apps/web/src/app/creator-program/layout.tsx`

---

## Steps for Google Search Console Indexing

1. Submit `sitemap.xml` in **Google Search Console**: `https://search.google.com/search-console`
2. Googlebot processes the `SiteNavigationElement` JSON-LD schema array.
3. As Google re-crawls `tolee.in`, it automatically transforms the single-line snippet into the 2-column Facebook-style Expanded Sitelinks block!
