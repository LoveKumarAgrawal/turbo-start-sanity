import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Blog } from "@/types";
import { useDebounce } from "./use-debounce";

const SEARCH_DEBOUNCE_MS = 400;
const CACHE_STALE_TIME_MS = 30_000;

async function searchBlog(query: string, signal: AbortSignal, categorySlug?: string) {
  if (!query.trim()) {
    return [];
  }

  const params = new URLSearchParams({ q: query });
  if (categorySlug) {
    params.set("category", categorySlug);
  }

  const response = await fetch(`/api/blog/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to search");
  }

  return response.json() as Promise<Blog[]>;
}

export function useBlogSearch(categorySlug?: string) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const hasQuery = debouncedQuery.trim().length > 0;
  const { data, isLoading, error } = useQuery({
    queryKey: ["blog-search", debouncedQuery, categorySlug],
    queryFn: ({ signal }) => searchBlog(debouncedQuery, signal, categorySlug),
    enabled: hasQuery,
    staleTime: CACHE_STALE_TIME_MS,
  });
  return {
    searchQuery,
    setSearchQuery,
    results: data ?? [],
    isSearching: isLoading,
    error,
    hasQuery,
  };
}
