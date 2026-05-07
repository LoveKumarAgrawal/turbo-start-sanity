import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/revalidate
 *
 * Called by a Sanity webhook whenever content is published/updated/deleted.
 * Triggers Next.js cache revalidation so Vercel serves fresh content.
 *
 * Sanity webhook setup:
 *  - URL: https://<your-vercel-url>/api/revalidate
 *  - Trigger: on create, update, delete
 *  - Filter: _type in ["blog", "blogIndex", "page", "navbar", "footer", "settings"]
 *  - HTTP method: POST
 *  - Secret header: x-sanity-webhook-secret: <SANITY_REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-sanity-webhook-secret");
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET;

  // If a secret is configured, enforce it
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const documentType = body?._type as string | undefined;

    // Revalidate based on which document type changed
    switch (documentType) {
      case "blog":
        // Revalidate the specific blog slug if provided
        if (body?.slug?.current) {
          revalidatePath(`/blog/${body.slug.current.replace("/blog/", "")}`);
        }
        // Always revalidate the blog listing page too
        revalidatePath("/blog");
        revalidatePath("/", "layout");
        break;

      case "blogIndex":
        revalidatePath("/blog");
        break;

      case "page":
        if (body?.slug?.current) {
          revalidatePath(`/${body.slug.current}`);
        }
        revalidatePath("/", "layout");
        break;

      case "navbar":
      case "footer":
      case "settings":
        // These affect the whole site layout
        revalidatePath("/", "layout");
        break;

      default:
        // Unknown type — revalidate everything to be safe
        revalidatePath("/", "layout");
        break;
    }

    return NextResponse.json({
      revalidated: true,
      type: documentType ?? "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[revalidate] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}
