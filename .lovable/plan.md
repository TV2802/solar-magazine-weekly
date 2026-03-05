

# Energy & Sustainability Weekly Newsletter

A bold, magazine-style public website that auto-curates weekly energy news across your chosen topics.

## Pages & Layout

### Homepage / Latest Issue
- **Hero banner** with the current week's date and issue number, bold typography and accent colors
- **Featured article** section with large image/card at the top
- **Topic sections** displayed as a magazine grid: Solar, Multifamily, Battery, Built Environment & Energy Measures, New Innovations, Company Success Stories
- Each section shows 3-4 curated article cards with title, source, summary snippet, and link to original
- **Footer** with about info and topic legend

### Archive Page
- Browse previous weekly issues by date

### Article Detail View
- Displays the curated summary with a prominent "Read Original" link to the source

## Content & Data

- **RSS/news feed aggregation** via Supabase Edge Functions that fetch from energy news RSS feeds (e.g., Solar Power World, Utility Dive, GreenTech Media, CleanTechnica, etc.)
- A **scheduled edge function** runs weekly to pull new articles, categorize them by topic using keyword matching, and store them in a Supabase database
- Articles stored with: title, summary, source URL, image, topic category, publish date, issue number

## Design Style
- **Bold & magazine-style**: Large typography, strong color blocks (dark backgrounds with vibrant accent colors like solar yellow, electric green, deep blue), card-based grid layout
- Clean sans-serif fonts, high contrast, editorial feel
- Responsive design for mobile and desktop

## Tech Approach
- Lovable Cloud (Supabase) for database + edge functions + scheduled cron job
- React frontend with topic filtering and weekly issue browsing
- No auth needed — fully public site

