

# ENERGYPULSE — Multifamily DER Newsletter Overhaul

The current app has 6 generic energy topics. The request is a major restructuring to 9 highly specialized sections for a DER developer/operator in multifamily housing, plus an AI-generated weekly digest.

## What Changes

### 1. Database: New Topic Enum
Replace the current 6-value `topic_category` enum with 9 new values:
- `policy_incentives` — Policy & Incentives Watch
- `technology_equipment` — Technology & Equipment Tracker
- `multifamily_nexus` — Multifamily Real Estate + Energy Nexus
- `market_pricing` — Market Pricing & Trends
- `code_compliance` — Code Compliance & State Mandates
- `bess_storage` — BESS & Storage Focus
- `innovation_spotlight` — Innovation Spotlight
- `project_wins` — Project & Company Wins
- `weekly_digest` — Weekly News Digest

Migration: rename existing enum values where mappable, add new ones, remove unused. Update existing articles to best-fit new categories.

### 2. RSS Feed Sources — Overhauled
Replace current generic feeds with DER/multifamily-specific sources:
- PV Magazine, SEIA, Canary Media, Greentech Media, Wood Mackenzie
- Utility Dive, Solar Power World, Energy Storage News
- DOE EERE, CPUC filings RSS, Multifamily Executive
- CleanTechnica, Electrek (kept but re-categorized)

Update keyword matching to use DER/multifamily-specific terminology (ITC, SGIP, VNEM, LFP, Title 24, NOI, SREC, TOU, NFPA 855, etc.) for much more precise categorization across 9 sections.

### 3. AI Weekly Digest (Section 9)
New edge function `generate-digest` that:
- Takes the week's curated articles
- Calls Lovable AI (gemini-2.5-flash) to generate a 4-5 sentence editorial summary
- Stores as a `weekly_digest` article in the DB
- Called after `fetch-articles` completes
- Has a "Refresh" button on the frontend

Add a `digest_text` column to `issues` table to store the generated digest per issue.

### 4. Frontend — New Section Layout
- **9 distinct sections** on the homepage, each with its emoji icon, name, and color
- New color variables for the 3 additional sections (code_compliance, bess_storage, innovation_spotlight expanded from generic)
- **Weekly Digest** rendered as a special card at the top (below hero), with editorial styling and a "Regenerate" button
- Section navigation: add a sticky topic nav/jump bar below the hero so users can jump to any section
- Update `TopicBadge`, `TopicSection`, `TOPIC_CONFIG` for 9 sections

### 5. Branding
- Rename from "Energy Pulse" to "ENERGYPULSE" throughout (nav, hero, footer, page title)
- Keep logo area as a simple icon + text combo, easy to swap later

### 6. Updated Pages
- **Homepage**: Hero → Digest card → 9 topic sections grid
- **Archive**: No structural change, works as-is
- **Article Detail**: No structural change

## Technical Steps (implementation order)

1. **DB migration**: Add new enum values, add `digest_text` to `issues`, migrate existing article topics
2. **Update `topics.ts`**: 9 sections with labels, colors, icons
3. **Update `tailwind.config.ts` + `index.css`**: Add 3 new energy color variables
4. **Update `fetch-articles` edge function**: New feeds, new keyword maps, 9-category classifier
5. **Create `generate-digest` edge function**: AI summary using Lovable AI
6. **Update homepage**: Digest card, section jump bar, 9 sections
7. **Update nav/hero/footer**: ENERGYPULSE branding
8. **Re-fetch articles**: Trigger edge function to populate with new categorization

