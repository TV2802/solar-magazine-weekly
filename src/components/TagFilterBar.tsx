import { ALL_TAGS, getTagToken } from "@/lib/tags";

interface TagFilterBarProps {
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  onClear: () => void;
  availableTags?: string[];
}

export function TagFilterBar({ activeTags, onTagToggle, onClear, availableTags }: TagFilterBarProps) {
  const tags = availableTags && availableTags.length > 0
    ? ALL_TAGS.filter(t => availableTags.includes(t))
    : ALL_TAGS;

  return (
    <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          <button
            onClick={onClear}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 font-mono text-[11px] font-medium tracking-wider transition-all duration-200 ${
              activeTags.length === 0
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            ALL
          </button>
          {tags.map((tag) => {
            const isActive = activeTags.includes(tag);
            const token = getTagToken(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 font-mono text-[11px] font-medium tracking-wider transition-all duration-200 ${
                  isActive
                    ? "text-primary-foreground shadow-lg"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `hsl(var(--energy-${token}))`,
                        boxShadow: `0 0 16px hsl(var(--energy-${token}) / 0.4)`,
                      }
                    : undefined
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.borderColor = `hsl(var(--energy-${token}) / 0.5)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.borderColor = '';
                  }
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
