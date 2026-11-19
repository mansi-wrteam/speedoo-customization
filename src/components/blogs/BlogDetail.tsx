import React, { useState, useEffect } from "react";
import { useServerData } from "@/utils/useServerData";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import { useRouter } from "next/router";
import * as api from "@/api/apiRoutes";
import { formatCustomDate } from "@/lib/utils";
import Loader from "../loader/Loader";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import RecentBlogsSwiper from "./RecentBlogsSwiper";

import { PiMediumLogoFill } from "react-icons/pi";
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinShareButton,
  LinkedinIcon,
  WhatsappShareButton,
  WhatsappIcon,
} from "react-share";
import { usePathname } from "next/navigation";
import type { Id } from "@/types/common";
import type { Blog } from "@/types/models";

const BlogDetail = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { slug } = router.query;
  // Supplied when the server rendered this page (SSR_PLAN.md §3.5, channel 3).
  const serverBlog = useServerData<Blog>("blog");

  const [blog, setBlog] = useState<Blog | null | undefined>(serverBlog ?? null);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>((serverBlog?.tag_names as string[]) ?? []);
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    if (!slug) return;
    if (serverBlog) {
      // The post itself is already here, so only the two side effects that are
      // NOT part of rendering it still have to run:
      //   - the view counter, which must still fire exactly once per page view;
      //     skipping it would silently stop view counts from incrementing.
      //   - the "recent blogs" sidebar, which the server does not load.
      handleSetBlogCount(serverBlog);
      handleFetchBlogs(serverBlog.id);
      return;
    }
    handleFetchBlog();
  }, [slug]);

  const handleFetchBlog = async () => {
    setLoading(true);
    try {
      const blog = await api.getBlogs({ slug: slug as string });
      setBlog(blog?.data?.[0]);
      handleSetBlogCount(blog?.data?.[0]);
      handleFetchBlogs(blog?.data?.[0]?.id);
      setTags(blog?.data?.[0]?.tag_names as string[]);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  const handleFetchBlogs = async (blogId: Id | undefined) => {
    try {
      const blogs = await api.getBlogs({
        offset: 0,
        limit: 10,
      });
      const filteredBlogs = blogs?.data?.filter((blog) => blog.id !== blogId);
      setRecentBlogs(filteredBlogs);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleSetBlogCount = async (blogData: Blog | undefined) => {
    try {
      const views = await api.setBlogCount({ blogId: blogData?.id });
    } catch (error) {
      console.log("error", error);
    }
  };

  return loading ? (
    <Loader />
  ) : (
    <>
      <BreadCrumb title={blog?.translations?.title}/>
      <div className="">
        <div className="bg-[var(--surface-subtle)]">
          {/* Tailwind's `container` has no padding configured, so the
              horizontal inset has to be explicit or content hits the edge. */}
          <div className="container flex flex-col gap-6 px-4 py-10">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl md:text-2xl font-semibold leading-7 md:leading-8 text-[var(--foreground-primary)]">
                {blog?.translations?.title}
              </h1>
              <p className="!text-start text-base font-normal leading-6 text-[var(--foreground-secondary)]">
                {blog?.translations?.short_description}
              </p>
            </div>
            <div className="w-full">
              <ImageWithPlaceholder
                className={"w-full aspect-video rounded-2xl object-cover"}
                src={blog?.image_url}
                alt={blog?.title}
                height={600}
                width={1000}
              />
            </div>
            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--surface-default)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] md:flex-row md:items-center md:gap-10">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                  {t("categories")}
                </p>
                <h4 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {blog?.category?.translations?.name}
                </h4>
              </div>
              <div className="hidden h-12 w-px bg-[var(--border-subtle)] md:block"></div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                  {t("published_date")}
                </p>
                <h4 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {blog?.created_at}
                </h4>
              </div>
              <div className="hidden h-12 w-px bg-[var(--border-subtle)] md:block"></div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                  {t("read_time")}
                </p>
                <h4 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{`${blog?.read_time}`}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="my-12">
          <div
            className="container !text-start px-4 api-html-content"
            dangerouslySetInnerHTML={{ __html: blog?.translations?.description as string }}
          ></div>
          {tags.length > 0 && (
            <div className="container px-4">
              <div className="my-10 h-0 border-t border-[var(--border-subtle)]"></div>
              <div className="flex w-full flex-col items-start justify-between gap-4 rounded-2xl bg-[var(--surface-subtle)] p-4 md:flex-row md:items-center">
                <div className="flex flex-1 flex-wrap items-center gap-4">
                  <span className="text-base font-medium leading-6 text-[var(--foreground-primary)]">{t("tags")}:</span>

                  {tags?.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--surface-default)] px-3 py-1 text-base font-normal leading-6 text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base font-medium leading-6 text-[var(--foreground-primary)]">{t("share")}:</span>

                  <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] [&_svg_rect]:fill-transparent [&_svg_path]:fill-[var(--foreground-primary)]">
                    <FacebookShareButton
                      url={`${process.env.NEXT_PUBLIC_BASE_URL}${decodeURI(
                        pathname
                      )}`}
                      className="flex h-8 w-8 items-center justify-center rounded-sm"
                    >
                      <FacebookIcon className="h-8 w-8" round={false} />
                    </FacebookShareButton>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] [&_svg_rect]:fill-transparent [&_svg_path]:fill-[var(--foreground-primary)]">
                    <LinkedinShareButton
                      url={`${process.env.NEXT_PUBLIC_BASE_URL}${decodeURI(
                        pathname
                      )}`}
                      className="flex h-8 w-8 items-center justify-center rounded-sm"
                    >
                      <LinkedinIcon className="h-8 w-8" round={false} />
                    </LinkedinShareButton>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] [&_svg_rect]:fill-transparent [&_svg_path]:fill-[var(--foreground-primary)]">
                    <WhatsappShareButton
                      url={`${process.env.NEXT_PUBLIC_BASE_URL}${decodeURI(
                        pathname
                      )}`}
                      className="flex h-8 w-8 items-center justify-center rounded-sm"
                    >
                      <WhatsappIcon className="h-8 w-8" round={false} />
                    </WhatsappShareButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <RecentBlogsSwiper recentBlogs={recentBlogs} />
    </>
  );
};

export default BlogDetail;
