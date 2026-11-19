import type React from "react";
import { t } from "@/utils/translation";
import type { Id } from "@/types/common";
import type { BlogTag } from "@/types/models";

export interface PopularBlogTagsProps {
  tags: BlogTag[];
  setSelectedTag: React.Dispatch<React.SetStateAction<Id | null>>;
  selectedTag: Id | null;
}

const PopularBlogTags = ({ tags, setSelectedTag, selectedTag }: PopularBlogTagsProps) => {

  const handleTagClick = (tagId: Id) => {
    if (tagId == selectedTag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tagId);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
        {t("popular_tags")}
      </h2>

      <div className="flex flex-wrap items-start gap-4">
        {tags.map((tag) => (
          <button
            onClick={() => handleTagClick(tag?.id)}
            key={tag.id}
            className={`max-w-full whitespace-normal break-words rounded-full px-3 py-1 text-center text-base font-normal leading-6 transition-colors ${
              tag?.id == selectedTag
                ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]"
                : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
            }`}
          >
            {tag?.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PopularBlogTags;
