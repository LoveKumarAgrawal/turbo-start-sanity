import { TagIcon } from "lucide-react";
import { defineField, defineType } from "sanity";
import slugify from "slugify";

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  description: "A category for grouping and filtering blog posts.",
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Title",
      description: "The display name of this category (e.g. 'Design', 'Engineering')",
      validation: (Rule) => Rule.required().error("Category title is required"),
    }),
    defineField({
      name: "slug",
      type: "slug",
      title: "Slug",
      description: "URL-friendly identifier used for filtering (auto-generated from title)",
      options: {
        source: "title",
        slugify: (input) =>
          slugify(input, { lower: true, strict: true }),
      },
      validation: (Rule) => Rule.required().error("Slug is required"),
    }),
    defineField({
      name: "description",
      type: "text",
      title: "Description",
      rows: 2,
      description: "Optional short description of this category",
    }),
  ],
  preview: {
    select: {
      title: "title",
      slug: "slug.current",
    },
    prepare: ({ title, slug }) => ({
      title: title ?? "Untitled Category",
      subtitle: slug ? `/${slug}` : "",
    }),
  },
});
