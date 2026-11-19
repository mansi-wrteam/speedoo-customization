// Blog posts (`api.getBlogs()` / `api.getMostViewedBlogs()` `data`), their
// categories (`api.getBlogsCategories()`) and tags (`api.getTags()`).

import type { DateString, Id, Numeric, Url } from "../common";

export interface BlogTranslations {
  title?: string;
  short_description?: string;
  /** HTML body. */
  description?: string;
  // SEO — read by pages/blog/[slug] getServerSideProps
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  schema_markup?: string;
}

export interface BlogCategory {
  id: Id;
  translations?: { name?: string };
  active_blogs_count?: Numeric;
}

export interface BlogTag {
  id: Id;
  name?: string;
}

export interface Blog {
  id: Id;
  slug?: string;
  /** Untranslated title; only used as image alt text. */
  title?: string;
  image_url?: Url;
  created_at?: DateString;
  read_time?: Numeric;
  /** Only `translations.name` is read. */
  category?: Pick<BlogCategory, "translations">;
  translations?: BlogTranslations;
  /** Tag labels shown on the detail page. */
  tag_names?: string[];
  /** Read by the blog detail page's getServerSideProps. */
  favicon?: Url;
}
