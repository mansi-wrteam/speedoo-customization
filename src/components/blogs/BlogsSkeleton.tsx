import React from "react";

interface BarProps {
  className?: string;
}

interface PanelProps {
  children: React.ReactNode;
}

// Placeholder bar used for every shimmering block below.
const Bar = ({ className = "" }: BarProps) => (
  <div className={`rounded bg-[var(--background-muted)] ${className}`}></div>
);

// Panel shell shared by the sidebar skeletons, mirroring the real panels.
const Panel = ({ children }: PanelProps) => (
  <div className="flex animate-pulse flex-col gap-6 rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
    {children}
  </div>
);

// Skeleton for BlogCard — mirrors BlogCard's shell so nothing shifts on load.
export const BlogCardSkeleton = () => {
  return (
    <div className="flex h-full animate-pulse flex-col gap-6 overflow-hidden rounded-2xl bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      {/* Image skeleton */}
      <Bar className="h-44 w-full rounded-lg" />

      <div className="flex flex-1 flex-col gap-4">
        {/* Category and date */}
        <div className="flex items-center gap-2">
          <Bar className="h-5 w-24" />
          <Bar className="h-1.5 w-1.5 rounded-full" />
          <Bar className="h-5 w-24" />
        </div>

        {/* Title + description */}
        <div className="flex flex-col gap-2">
          <Bar className="h-6 w-full" />
          <Bar className="h-6 w-4/5" />
          <Bar className="h-5 w-full" />
          <Bar className="h-5 w-3/4" />
        </div>
      </div>

      {/* Read more button */}
      <Bar className="h-10 w-32 rounded-lg" />
    </div>
  );
};

// Skeleton for Categories
const CategoriesSkeleton = () => {
  return (
    <Panel>
      <Bar className="h-6 w-32" />
      <div className="flex flex-col gap-6">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-default)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
          >
            <div className="flex items-center gap-2">
              <Bar className="h-5 w-6" />
              <Bar className="h-5 w-32" />
            </div>
            <Bar className="h-5 w-8" />
          </div>
        ))}
      </div>
    </Panel>
  );
};

// Skeleton for Recent Blogs
const RecentBlogsSkeleton = () => {
  return (
    <Panel>
      <Bar className="h-6 w-36" />
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 rounded-lg bg-[var(--surface-default)] p-2 outline outline-1 -outline-offset-1 outline-[var(--surface-subtle)]"
          >
            <Bar className="h-16 w-28 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Bar className="h-5 w-24" />
              <Bar className="h-5 w-full" />
              <Bar className="h-5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

// Main Blogs Skeleton Component
const BlogsSkeleton = () => {
  return (
    <div className="container mx-auto my-12 px-4">
      <div className="grid md:grid-cols-12 gap-6 grid-cols-1">
        {/* Blog cards skeleton */}
        <div className="md:col-span-8 col-span-12 grid md:grid-cols-2 grid-cols-1 items-stretch gap-6">
          {[1, 2, 3, 4].map((item) => (
            <BlogCardSkeleton key={item} />
          ))}
        </div>

        {/* Sidebar skeleton */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
          <CategoriesSkeleton />
          <RecentBlogsSkeleton />
        </div>
      </div>
    </div>
  );
};

// Demo Component
export default function BlogSkeleton() {
  return (
    <div className="min-h-screen ">
      <BlogsSkeleton />
    </div>
  );
}
