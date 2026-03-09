import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip HTML tags and decode HTML entities from a string */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Use DOMParser to decode entities AND strip tags in one pass
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  } catch {
    // Fallback: decode entities first, then strip tags
    let text = html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "\u2019")
      .replace(/&lsquo;/g, "\u2018")
      .replace(/&rdquo;/g, "\u201D")
      .replace(/&ldquo;/g, "\u201C")
      .replace(/&ndash;/g, "\u2013")
      .replace(/&mdash;/g, "\u2014")
      .replace(/&nbsp;/g, " ")
      .replace(/&#\d+;/g, (m) => {
        const code = parseInt(m.replace(/&#|;/g, ""), 10);
        return String.fromCharCode(code);
      });
    text = text.replace(/<[^>]*>/g, " ");
    return text.replace(/\s+/g, " ").trim();
  }
}
