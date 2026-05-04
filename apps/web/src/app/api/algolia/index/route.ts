import { type NextRequest, NextResponse } from "next/server";

import { getAdminClient, indexName } from "@/lib/algolia/client";
import { client } from "@/lib/sanity/client";
import { queryAllBlogDataForSearch } from "@/lib/sanity/query";

/**
 * POST /api/algolia/index
 *
 * Fetches all blog posts from Sanity and upserts them into Algolia.
 * Should be called after content changes (e.g. from a Sanity webhook).
 *
 * Protect this route with a secret header to prevent abuse.
 */
export async function POST(request: NextRequest) {
  // Simple secret check — set ALGOLIA_REINDEX_SECRET in env
  const secret = request.headers.get("x-reindex-secret");
  const expectedSecret = process.env.ALGOLIA_REINDEX_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const algolia = getAdminClient();

    // Fetch all blogs from Sanity (bypasses CDN for freshest data)
    const blogs = await client.fetch(queryAllBlogDataForSearch);

    if (!blogs || blogs.length === 0) {
      return NextResponse.json({ message: "No blogs to index" });
    }

    // Transform to Algolia records
    const records = blogs.map((blog: { _id: string; title?: string | null; description?: string | null; slug?: string | null; publishedAt?: string | null; authors?: { name?: string | null } | null; categories?: Array<{ title?: string | null; slug?: string | null }> | null; image?: { id?: string | null } | null }) => ({
      objectID: blog._id,
      title: blog.title ?? "",
      description: blog.description ?? "",
      slug: blog.slug ?? "",
      publishedAt: blog.publishedAt ?? "",
      authorName: blog.authors?.name ?? "",
      categories: (blog.categories ?? []).map((c: { title?: string | null; slug?: string | null }) => c.title ?? ""),
      categorySlugs: (blog.categories ?? []).map((c: { title?: string | null; slug?: string | null }) => c.slug ?? ""),
    }));

    // Upsert all records (replaceAllObjects keeps the index consistent)
    await algolia.replaceAllObjects({ indexName, objects: records });

    return NextResponse.json({
      success: true,
      indexed: records.length,
    });
  } catch (error) {
    console.error("[Algolia Index] Error:", error);
    return NextResponse.json(
      { error: "Failed to index blogs" },
      { status: 500 }
    );
  }
}
