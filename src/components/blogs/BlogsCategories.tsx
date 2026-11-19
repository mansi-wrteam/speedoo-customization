import React from "react";
import { t } from "@/utils/translation";
import type { Id } from "@/types/common";
import type { BlogCategory } from "@/types/models";

export interface BlogsCategoriesProps {
  blogsCategories: BlogCategory[];
  selectedCategory: Id | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<Id | null>>;
}

const BlogsCategories = ({
  blogsCategories,
  selectedCategory,
  setSelectedCategory,
}: BlogsCategoriesProps) => {
  return (
    <div className="flex flex-col gap-6 overflow-hidden rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
        {t("categories")}
      </h2>
      <div className="flex flex-col gap-6">
        {blogsCategories?.map((category, i) => {
          const isSelected = selectedCategory == category?.id;
          return (
            <div
              key={category?.id}
              onClick={() => setSelectedCategory(category?.id)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg p-4 text-base leading-6 transition-colors ${
                isSelected
                  ? "bg-[var(--brand-foreground-default)] font-bold text-[var(--brand-foreground-inverse)] opacity-90"
                  : "bg-[var(--surface-default)] font-normal text-[var(--foreground-secondary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <p>{String(i + 1).padStart(2, "0")}.</p>
                <p className="line-clamp-1">{category?.translations?.name}</p>
              </div>
              <p className="shrink-0">{`(${category?.active_blogs_count})`}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BlogsCategories;
