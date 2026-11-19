"use client";
import React, { useState, useEffect } from "react";
import BlogCard from "./BlogCard";
import BlogsCategories from "./BlogsCategories";
import RecentBlogs from "./RecentBlogs";
import * as api from "@/api/apiRoutes";
import BlogSkeleton, { BlogCardSkeleton } from "./BlogsSkeleton";
import { t } from "@/utils/translation";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import PopularBlogTags from "./PopularBlogTags";
import type { Id } from "@/types/common";
import type { Blog, BlogCategory, BlogTag } from "@/types/models";
import { useServerData } from "@/utils/useServerData";

const Blogs = () => {
  // Supplied when the server rendered this page (SSR_PLAN.md §3.5, channel 3);
  // undefined in the static export, for a non-default language, and on
  // client-side navigation, where the mount effects run as they always have.
  const serverBlogs = useServerData<{ data: Blog[]; total: number }>("blogs");
  const serverCategories = useServerData<BlogCategory[]>("blogCategories");
  const serverTags = useServerData<BlogTag[]>("blogTags");
  const serverMostViewed = useServerData<Blog[]>("mostViewedBlogs");

  const [blogs, setBlogs] = useState<Blog[]>(serverBlogs?.data ?? []);
  const [blogsCategories, setBlogCategories] = useState<BlogCategory[]>(serverCategories ?? []);
  const [selectedCategory, setSelectedCategory] = useState<Id | null>(null);
  const [selectedTag, setSelectedTag] = useState<Id | null>(null);
  const [mostViewedBlogs, setMostViewedBlogs] = useState<Blog[]>(serverMostViewed ?? []);
  const [offset, setOffset] = useState(0);
  const [totalBlogs, setTotalBlogs] = useState<number | null | undefined>(serverBlogs?.total ?? null);
  const [loading, setLoading] = useState(serverBlogs ? false : true);
  const [blogsLoading, setBlogsLoading] = useState(false);
  // Seeded like the three above. Missing this while ALSO skipping handleTagFetch
  // below left `tags` empty for the life of the page, so the Popular Tags card
  // silently stopped rendering on every server-rendered /blogs.
  const [tags, setTags] = useState<BlogTag[]>(serverTags ?? []);
  const topRef = React.useRef<HTMLDivElement>(null);

  const BLOG_LIMIT = 10;

  useEffect(() => {
    // Each sidebar fetch is skipped only if the server supplied that list, so a
    // partially successful server load still fills the gaps.
    if (!serverCategories) handleFetchBlogsCategoris();
    if (!serverMostViewed) getMostViewedBlogs();
    if (!serverTags) handleTagFetch();
  }, []);

  // Runs on every category/tag change. The first run is skipped when the server
  // already fetched the unfiltered first page — refetching it would flash the
  // list — but any later change still fetches, because the filter has moved.
  const skipFirstBlogFetch = React.useRef(Boolean(serverBlogs));
  useEffect(() => {
    if (skipFirstBlogFetch.current) {
      skipFirstBlogFetch.current = false;
      return;
    }
    setOffset(0);
    handleFetchBlogs(false, 0);
  }, [selectedCategory, selectedTag]);

  const handleTagFetch = async () => {
    try {
      const response = await api.getTags();
      setTags(response?.data);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleFetchBlogs = async (isFetchMore = false, customOffset: number) => {
    setBlogsLoading(true);
    try {
      const blogs = await api.getBlogs({
        offset: customOffset,
        limit: BLOG_LIMIT,
        categoryId: selectedCategory,
        tag_id: selectedTag,
      });
      if (isFetchMore) {
        setBlogs((prev) => [...prev, ...blogs.data]);
        setOffset((prev) => prev + BLOG_LIMIT);
      } else {
        setBlogs(blogs?.data);
        setOffset((prev) => prev + BLOG_LIMIT);
      }
      setBlogsLoading(false);
      setTotalBlogs(blogs?.total);
    } catch (error) {
      setBlogsLoading(false);
      console.log("error", error);
    }
  };

  const handleFetchBlogsCategoris = async () => {
    setLoading(true);
    try {
      const blogsCategories = await api.getBlogsCategories({ offset: 0, limit: 10 });
      setBlogCategories(blogsCategories?.data);
      setLoading(false);
    } catch (error) {
      console.log("error", error);
      setLoading(false);
    }
  };

  const getMostViewedBlogs = async () => {
    setLoading(true);
    try {
      const response = await api.getMostViewedBlogs({ limit: 5 });
      setMostViewedBlogs(response.data);
      setLoading(false);
    } catch (error) {
      console.log("error", error);
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!blogsLoading && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [blogsLoading]);

  const blogAvailable =
  blogsCategories?.length > 0 ||
  mostViewedBlogs?.length > 0 ||
  tags?.length > 0;

  const isFiltering = selectedCategory !== null || selectedTag !== null;

  return loading ? (
    <BlogSkeleton />
  ) : (
    <>
      <div ref={topRef}></div>
      <BreadCrumb />
      <div className="container my-12">
        <div className="grid lg:grid-cols-12 gap-6 grid-cols-1">
          <div className={`${isFiltering || blogs?.length > 0  ? "lg:col-span-8" : "lg:col-span-12"} md:col-span-12 col-span-12 flex flex-col gap-6`}>
            {blogs?.length == 0 && (
              <div className="w-full flex  justify-center items-center  h-[200px]">
                <h1 className="text-2xl font-bold text-[var(--foreground-primary)]">{t("noBlogFound")}</h1>
              </div>
            )}
            <div className="grid lg:grid-cols-2 grid-cols-1 md:grid-cols-2 items-stretch gap-6">
              {blogsLoading
                ? Array?.from({ length: 3 })?.map((_, i) => (
                    <BlogCardSkeleton key={i} />
                  ))
                : blogs?.map((blog, i) => <BlogCard key={i} blog={blog} />)}
            </div>
            {blogs?.length < (totalBlogs as number) && (
              <div className="w-full flex justify-center mt-6">
                <button
                  className="rounded-lg px-6 py-3 text-xl font-medium leading-7 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
                  onClick={() => handleFetchBlogs(true, offset)}
                >
                  {t("load_more")}
                </button>
              </div>
            )}
          </div>

          {(blogAvailable && (isFiltering || blogs.length > 0)) && (
            <div className="lg:col-span-4 md:col-span-12 col-span-12 flex flex-col gap-6">
              {blogsCategories?.length > 0 && (
                <BlogsCategories
                  blogsCategories={blogsCategories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              )}
              {mostViewedBlogs?.length > 0 && (
                <RecentBlogs mostViewedBlogs={mostViewedBlogs} />
              )}
              {tags?.length > 0 && (
                <PopularBlogTags
                  tags={tags}
                  setSelectedTag={setSelectedTag}
                  selectedTag={selectedTag}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Blogs;
