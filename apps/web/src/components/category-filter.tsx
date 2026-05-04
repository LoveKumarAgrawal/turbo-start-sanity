"use client";

import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Category = {
  _id: string;
  title: string | null;
  slug: string | null;
  description?: string | null;
};

type CategoryFilterProps = {
  categories: Category[];
  /** Comma-separated active slugs e.g. "sanity,nextjs" */
  activeCategories?: string[];
  className?: string;
};

export function CategoryFilter({
  categories,
  activeCategories = [],
  className,
}: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (!categories || categories.length === 0) {
    return null;
  }

  function buildUrl(nextActive: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("page");
    for (const slug of nextActive) {
      params.append("category", slug);
    }
    return `/blog?${params.toString()}`;
  }

  function toggleCategory(slug: string | null) {
    if (!slug) {
      // "All" — clear everything
      startTransition(() => router.push(buildUrl([])));
      return;
    }
    const next = activeCategories.includes(slug)
      ? activeCategories.filter((s) => s !== slug) // deselect
      : [...activeCategories, slug]; // add
    startTransition(() => router.push(buildUrl(next)));
  }

  function removeSelected(slug: string) {
    const next = activeCategories.filter((s) => s !== slug);
    startTransition(() => router.push(buildUrl(next)));
  }

  const hasActive = activeCategories.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter pill row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          Filter:
        </span>

        {/* "All" pill */}
        <button
          aria-pressed={!hasActive}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            !hasActive
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
          disabled={isPending}
          onClick={() => toggleCategory(null)}
          type="button"
        >
          All
        </button>

        {categories.map((cat) => {
          const isActive = cat.slug ? activeCategories.includes(cat.slug) : false;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
              disabled={isPending}
              key={cat._id}
              onClick={() => toggleCategory(cat.slug)}
              type="button"
            >
              {cat.title}
            </button>
          );
        })}
      </div>

      {/* Selected chips row */}
      {hasActive && (
        <div className="flex flex-wrap items-center gap-2">
          {activeCategories.map((slug) => {
            const cat = categories.find((c) => c.slug === slug);
            if (!cat) return null;
            return (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-1 text-background text-xs font-medium"
                key={slug}
              >
                {cat.title}
                <button
                  aria-label={`Remove ${cat.title} filter`}
                  className="rounded-full p-0.5 hover:bg-background/20 transition-colors"
                  disabled={isPending}
                  onClick={() => removeSelected(slug)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <button
            className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground transition-colors"
            disabled={isPending}
            onClick={() => toggleCategory(null)}
            type="button"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
