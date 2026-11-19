import React from "react";
import { t } from "@/utils/translation";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { useRouter } from "next/navigation";
import type { Blog } from "@/types/models";

export interface RecentBlogsProps {
  mostViewedBlogs: Blog[];
}

const RecentBlogs = ({ mostViewedBlogs }: RecentBlogsProps) => {
  const router = useRouter();

  const handleBlogNavigation = (slug: string | undefined) => {
    router.push(`/blog/${slug}`);
  };

  return (
    <div className="flex flex-col gap-6 overflow-hidden rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
        {t("topViewedBlogs")}
      </h2>
      <div className="flex flex-col gap-6">
        {mostViewedBlogs?.map((blog) => {
          return (
            <div
              className="flex cursor-pointer items-start gap-2 overflow-hidden rounded-lg bg-[var(--surface-default)] p-2 outline outline-1 -outline-offset-1 outline-[var(--surface-subtle)]"
              onClick={() => handleBlogNavigation(blog?.slug)}
              key={blog?.id}
            >
              <ImageWithPlaceholder
                className="h-full w-28 shrink-0 rounded-lg object-cover"
                src={blog?.image_url}
                alt={blog?.translations?.title}
                width={390}
                height={264}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                  {blog?.category?.translations?.name}
                </p>
                <h2
                  className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--foreground-primary)]"
                  title={blog?.translations?.title}
                >
                  {blog?.translations?.title}
                </h2>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentBlogs;
