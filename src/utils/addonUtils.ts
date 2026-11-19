// Add-on parsing rules (food module only). The API's shape has several traps
// that a naive read gets wrong, so every consumer goes through these helpers.
//
// Source of truth: WEB_PARITY_V4.0.1 §1.2 / §1.5.
import type { Id } from "@/types/common";
import type { AddonGroup, AddonOption, AddonSelectionType, AddonSelections } from "@/types/models/product";

type Maybe<T> = T | null | undefined;
/** An add-on group after getAddonGroups: only live options, always an array. */
export type LiveAddonGroup = AddonGroup & { options: AddonOption[] };
type PricedLine = { discounted_price?: unknown; price?: unknown; addon_price?: unknown; qty?: unknown };

// A group or option the seller has switched off must never render.
const isLive = (entity: Maybe<{ status?: unknown }>) => Number(entity?.status) === 1;

// `selection_type` absent or unrecognised falls back to "multiple": a wrong
// "single" would silently drop the customer's picks.
export const getSelectionType = (group: Maybe<Pick<AddonGroup, "selection_type">>): AddonSelectionType =>
  group?.selection_type === "single" ? "single" : "multiple";

// `max_select: 0` means unlimited, not "pick none". "single" is always 1
// whatever max_select claims.
export const getEffectiveMax = (group: Maybe<AddonGroup>): number => {
  const optionCount = group?.options?.length || 0;
  if (getSelectionType(group) === "single") return 1;
  const max = Number(group?.max_select) || 0;
  return max > 0 ? Math.min(max, optionCount) : optionCount;
};

// `discounted_price: null` means *no discount*; `0` means *now free*. Collapsing
// null to 0 would make every option free.
export const getOptionPrice = (option: Maybe<Pick<AddonOption, "price" | "discounted_price">>): number => {
  const price = Number(option?.price) || 0;
  if (option?.discounted_price == null) return price;
  const discounted = Number(option.discounted_price);
  return discounted < price ? discounted : price;
};

export const isOptionDiscounted = (option: Maybe<Pick<AddonOption, "price" | "discounted_price">>) =>
  option?.discounted_price != null &&
  Number(option.discounted_price) < (Number(option?.price) || 0);

// A mistyped "free" group must not hide a real charge, so the price column
// shows whenever the group is paid OR anything in it costs money.
export const groupShowsPrice = (group: Maybe<AddonGroup>) =>
  group?.type === "paid" || group?.options?.some((o) => getOptionPrice(o) > 0);

// Live groups with their live options, ready to render.
export const getAddonGroups = (product: Maybe<{ addon_groups?: Maybe<AddonGroup[]> }>): LiveAddonGroup[] =>
  (product?.addon_groups || [])
    .filter(isLive)
    .map((group) => ({ ...group, options: (group?.options || []).filter(isLive) }))
    .filter((group) => group.options.length > 0);

export const hasAddons = (product: Maybe<{ addon_groups?: Maybe<AddonGroup[]> }>) => getAddonGroups(product).length > 0;

// Sum of the effective prices of every picked option, per unit.
// `selections` is { [groupId]: optionId[] }.
export const getSelectedAddonsTotal = (groups: LiveAddonGroup[], selections: Maybe<AddonSelections>): number =>
  groups.reduce((sum, group) => {
    const picked = selections?.[group.id] || [];
    return (
      sum +
      group.options
        .filter((option) => picked.includes(option.id))
        .reduce((s, option) => s + getOptionPrice(option), 0)
    );
  }, 0);

export const flattenSelections = (selections: Maybe<AddonSelections>): Id[] =>
  Object.values(selections || {}).flat();

// The backend nulls flat `name` fields and answers under `translations`, on
// addon groups/options and on the cart's `selected_addons` alike. Flat first
// would render blanks, so always resolve through here.
export const getAddonName = (entity: Maybe<{ translations?: Maybe<{ name?: Maybe<string> }>; name?: Maybe<string> }>): string =>
  entity?.translations?.name || entity?.name || "";

// ── Cart line helpers ───────────────────────────────────────────────────────

// A cart row's per-unit price: the product's own price plus its add-ons. A row
// that printed the bare product price would not add up to the bill.
export const getCartLineUnitPrice = (line: Maybe<PricedLine>): number => {
  const base = Number(line?.discounted_price) || Number(line?.price) || 0;
  return base + (Number(line?.addon_price) || 0);
};

export const getCartLineTotal = (line: Maybe<PricedLine>): number =>
  getCartLineUnitPrice(line) * (Number(line?.qty) || 0);

// The cart is NOT ordered by insertion (observed: 1290, 1283, 1285), so the
// most recent line for a product is the highest cart_id — never the last entry.
export const findLatestCartLine = <T extends { product_id?: unknown; cart_id?: unknown }>(cartLines: Maybe<T[]>, productId: unknown) =>
  (cartLines || [])
    .filter((line) => String(line?.product_id) === String(productId))
    .reduce<T | null>(
      (latest, line) =>
        !latest || Number(line?.cart_id) > Number(latest?.cart_id) ? line : latest,
      null
    );
