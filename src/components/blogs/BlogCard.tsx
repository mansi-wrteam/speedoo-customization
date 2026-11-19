import React from "react";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { BsArrowUpRightCircle } from "react-icons/bs";
import { t } from "@/utils/translation";
import { LocalizedLink } from "@/utils/localizedNav";
import type { Blog } from "@/types/models";

export interface BlogCardProps {
  blog: Blog;
}

const BlogCard = ({ blog }: BlogCardProps) => {
  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <ImageWithPlaceholder
        className="h-44 w-full rounded-lg object-cover"
        src={blog?.image_url}
        alt={blog?.translations?.title}
        width={390}
        height={176}
        quality={90}
        sizes="(max-width: 640px) 100vw, 390px"
      />
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
            {blog?.category?.translations?.name}
          </p>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--foreground-tertiary)]" />
          <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
            {blog?.created_at}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2
            className="line-clamp-2 text-base font-semibold leading-6 text-[var(--foreground-primary)]"
            title={blog?.translations?.title}
          >
            {blog?.translations?.title}
          </h2>
          <p className="line-clamp-2 text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
            {blog?.translations?.short_description}
          </p>
        </div>
      </div>
      <div>
        {/* A real anchor, not a button with router.push. Google follows
            <a href>; it does not fire click handlers, so while this was a button
            every blog post was unreachable from the listing — server-rendering
            the listing did not help. Also restores middle-click,
            open-in-new-tab and prefetch. */}
        <LocalizedLink
          href={`/blog/${blog?.slug}`}
          className="inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
        >
          {t("readMore")} <BsArrowUpRightCircle size={16} />
        </LocalizedLink>
      </div>
    </div>
  );
};

export default BlogCard;
