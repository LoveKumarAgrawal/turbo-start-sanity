import { notFound } from "next/navigation";

import { BlogHeader } from "@/components/blog-card";
import { BlogPageContent } from "@/components/blog-page-content";
import { PageBuilder } from "@/components/pagebuilder";
import { sanityFetch } from "@/lib/sanity/live";
import {
  queryAllCategories,
  queryBlogIndexPageBlogs,
  queryBlogIndexPageBlogsByCategories,
  queryBlogIndexPageBlogsCount,
  queryBlogIndexPageBlogsCountByCategories,
  queryBlogIndexPageData,
} from "@/lib/sanity/query";
import { getSEOMetadata } from "@/lib/seo";
import {
  calculatePaginationMetadata,
  getBlogPaginationStartEnd,
  handleErrors,
} from "@/utils";

async function fetchBlogIndexPageData() {
  const res = await sanityFetch({ query: queryBlogIndexPageData });
  return res.data;
}

async function fetchBlogIndexPageBlogs(
  start: number,
  end: number,
  categorySlugs: string[]
) {
  if (categorySlugs.length > 0) {
    const res = await sanityFetch({
      query: queryBlogIndexPageBlogsByCategories,
      params: { start, end, categorySlugs },
    });
    return res.data;
  }
  const res = await sanityFetch({
    query: queryBlogIndexPageBlogs,
    params: { start, end },
  });
  return res.data;
}

async function fetchBlogIndexPageBlogsCount(categorySlugs: string[]) {
  if (categorySlugs.length > 0) {
    const res = await sanityFetch({
      query: queryBlogIndexPageBlogsCountByCategories,
      params: { categorySlugs },
    });
    return res.data;
  }
  const res = await sanityFetch({
    query: queryBlogIndexPageBlogsCount,
  });
  return res.data;
}

async function fetchAllCategories() {
  const res = await sanityFetch({ query: queryAllCategories });
  return res.data;
}

export async function generateMetadata() {
  const { data: result } = await sanityFetch({
    query: queryBlogIndexPageData,
    stega: false,
  });
  return getSEOMetadata(
    result
      ? {
          title: result?.title ?? result?.seoTitle ?? "",
          description: result?.description ?? result?.seoDescription ?? "",
          slug: result?.slug,
          contentId: result?._id,
          contentType: result?._type,
        }
      : {}
  );
}

type BlogPageProps = {
  searchParams: Promise<{
    page?: string;
    // Next.js gives string for single value, string[] for multiple ?category= params
    category?: string | string[];
  }>;
};

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const { page, category } = await searchParams;
  const currentPage = page ? Number(page) : 1;

  // Normalise to a string array — handles ?category=a and ?category=a&category=b
  const categorySlugs: string[] = category
    ? Array.isArray(category)
      ? category
      : [category]
    : [];

  const isFiltering = categorySlugs.length > 0;

  // Fetch page data, total count, and categories in parallel
  const [
    [indexPageData, errIndexPageData],
    [totalCount, errTotalCount],
    [categories, errCategories],
  ] = await Promise.all([
    handleErrors(fetchBlogIndexPageData()),
    handleErrors(fetchBlogIndexPageBlogsCount(categorySlugs)),
    handleErrors(fetchAllCategories()),
  ]);

  if (errIndexPageData || !indexPageData) {
    notFound();
  }

  if (errTotalCount || totalCount === null || totalCount === undefined) {
    return (
      <main className="container mx-auto my-16 px-4 md:px-6">
        <BlogHeader
          description={indexPageData.description}
          title={indexPageData.title}
        />
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            Unable to load blog posts at the moment.
          </p>
        </div>
        {indexPageData.pageBuilder && indexPageData.pageBuilder.length > 0 && (
          <PageBuilder
            id={indexPageData._id}
            pageBuilder={indexPageData.pageBuilder}
            type={indexPageData._type}
          />
        )}
      </main>
    );
  }

  const featuredBlogsCount = indexPageData.displayFeaturedBlogs
    ? Number(indexPageData.featuredBlogsCount) || 0
    : 0;

  const paginationMetadata = calculatePaginationMetadata(
    totalCount,
    currentPage
  );

  const { start, end } = getBlogPaginationStartEnd(currentPage);
  // Skip featured offset when filtering
  const blogStart =
    !isFiltering && currentPage === 1 ? 0 : start + (isFiltering ? 0 : featuredBlogsCount);
  const blogEnd =
    !isFiltering && currentPage === 1
      ? end + featuredBlogsCount
      : end + (isFiltering ? 0 : featuredBlogsCount);

  const [blogs, errBlogs] = await handleErrors(
    fetchBlogIndexPageBlogs(blogStart, blogEnd, categorySlugs)
  );

  if (errBlogs || !blogs) {
    return (
      <main className="container mx-auto my-16 px-4 md:px-6">
        <BlogHeader
          description={indexPageData.description}
          title={indexPageData.title}
        />
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No blog posts available at the moment.
          </p>
        </div>
        {indexPageData.pageBuilder && indexPageData.pageBuilder.length > 0 && (
          <PageBuilder
            id={indexPageData._id}
            pageBuilder={indexPageData.pageBuilder}
            type={indexPageData._type}
          />
        )}
      </main>
    );
  }

  return (
    <BlogPageContent
      activeCategories={categorySlugs}
      blogs={blogs}
      categories={errCategories ? [] : (categories ?? [])}
      indexPageData={indexPageData}
      paginationMetadata={paginationMetadata}
    />
  );
}
