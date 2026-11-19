// Map between a module's id and its slug.
//   - id   → used internally (the X-Module-Id API header, guest-cart item data)
//   - slug → used in the URL (?module=grocery) for readable/SEO-friendly links
// Both helpers need the modules list from redux (state.Module.modules), which
// carries { id, slug } for each module.
import type { Id } from "@/types/common";
import type { Module } from "@/types/models/module";

type ModuleList = Pick<Module, "id" | "slug">[] | null | undefined;

export const slugFromModuleId = (modules: ModuleList, id: Id | null | undefined): string | undefined => {
  if (id == null) return undefined;
  return (modules || []).find((m) => String(m?.id) === String(id))?.slug;
};

export const moduleIdFromSlug = (modules: ModuleList, slug: string | string[] | null | undefined): Id | undefined => {
  if (!slug) return undefined;
  return (modules || []).find((m) => m?.slug === slug)?.id;
};
