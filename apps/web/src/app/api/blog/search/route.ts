import Fuse from "fuse.js";
import { NextResponse } from "next/server";

import { indexName } from "@/lib/algolia/client";
import { sanityFetch } from "@/lib/sanity/live";
import { queryAllBlogDataForSearch } from "@/lib/sanity/query";

export const revalidate = 60; // 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  // Support multiple ?category= params OR a single comma-separated value
  const categoryParams = searchParams.getAll("category");
  const categorySlugs = categoryParams.flatMap((c) => c.split(",")).filter(Boolean);

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Try Algolia first, fall back to Fuse.js if env vars are not configured
  const algoliaAppId = process.env.ALGOLIA_APP_ID;
  const algoliaSearchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? process.env.ALGOLIA_ADMIN_API_KEY;

  if (algoliaAppId && algoliaSearchKey) {
    try {
      const { algoliasearch } = await import("algoliasearch");
      const algolia = algoliasearch(algoliaAppId, algoliaSearchKey);

      // Algolia OR filter: categorySlugs:design OR categorySlugs:engineering
      const filters = categorySlugs.length > 0
        ? categorySlugs.map((s) => `categorySlugs:${s}`).join(" OR ")
        : undefined;

      const { hits } = await algolia.searchSingleIndex({
        indexName,
        searchParams: {
          query,
          hitsPerPage: 10,
          ...(filters ? { filters } : {}),
        },
      });

      // Return hits in the same Blog shape as Fuse fallback
      return NextResponse.json(hits);
    } catch (err) {
      console.error("[Search] Algolia error, falling back to Fuse:", err);
      // Fall through to Fuse.js
    }
  }

  // Fuse.js fallback
  const { data } = await sanityFetch({
    query: queryAllBlogDataForSearch,
    stega: false,
  });

  if (!data) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  let dataset = data;

  // Apply category filter manually for Fuse fallback
  if (categorySlugs.length > 0) {
    dataset = data.filter((blog: { categories?: Array<{ slug?: string | null }> | null }) =>
      (blog.categories ?? []).some((c: { slug?: string | null }) => categorySlugs.includes(c?.slug ?? ""))
    );
  }

  const fuse = new Fuse(dataset, {
    keys: ["title", "description", "slug", "authors.name"],
    threshold: 0.3,
  });

  const results = fuse.search(query, { limit: 10 });
  return NextResponse.json(results.map((result) => result.item));
}

