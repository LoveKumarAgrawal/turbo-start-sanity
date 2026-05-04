import { algoliasearch } from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID;
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;
const searchApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? "blogs";

if (!appId || !adminApiKey) {
  // Only warn — admin key is only needed on the server for indexing
}

/**
 * Admin client — used server-side only for indexing.
 * Will throw if env vars are missing.
 */
export function getAdminClient() {
  if (!appId || !adminApiKey) {
    throw new Error(
      "Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_API_KEY environment variables"
    );
  }
  return algoliasearch(appId, adminApiKey);
}

/**
 * Search-only client — safe to use in API routes or server components.
 */
export function getSearchClient() {
  const key = searchApiKey ?? adminApiKey;
  if (!appId || !key) {
    throw new Error(
      "Missing Algolia environment variables for search"
    );
  }
  return algoliasearch(appId, key);
}

export { indexName };
