

## Plan: Clean HTML from Article Summaries

### 1. Clean existing data via SQL migration
Run an UPDATE query on the `articles` table that strips HTML tags and decodes common entities from the `summary` column. This uses PostgreSQL's `regexp_replace` to strip `<...>` tags, then replaces common HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`, `&rsquo;`, `&ldquo;`, `&rdquo;`, `&mdash;`, `&ndash;`).

### 2. Update fetch-articles edge function
Add a `stripHtml` helper function in `supabase/functions/fetch-articles/index.ts` that removes HTML tags via regex and decodes HTML entities. Apply it to the `description` at line 646 so summaries are stored clean:

```typescript
summary: stripHtml(description).slice(0, 500),
```

The `stripHtml` function will use regex (`/<[^>]*>/g`) to remove tags and a map of common entity replacements — same approach but server-side in Deno (no DOMParser available).

### Files to modify
- **Database migration**: UPDATE articles SET summary = cleaned text
- **`supabase/functions/fetch-articles/index.ts`**: Add `stripHtml` helper, apply to summary before insert

