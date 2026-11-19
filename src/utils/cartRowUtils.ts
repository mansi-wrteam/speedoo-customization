// Cart-row and pay-bar rules from WEB_PARITY_V4.0.2 §1.5–§1.7.
//
// Every one of these is a trap the app paid for once. They live here so the
// checkout screen, the drawer and the sheets can't disagree about them.
import { buildAttributes, getAttributeValues, hasAttributeVariants } from "@/utils/variantUtils";
import type { Flag, Id, Numeric } from "@/types/common";
import type { ApiCartItem, CartData } from "@/types/models/cart";
import type { PaymentSettings } from "@/types/models/settings";
import type { ProductVariant } from "@/types/models/product";

type Maybe<T> = T | null | undefined;

/**
 * §1.5 / trap 1: an unfulfillable row carries the **string** `"0"`. Truthiness
 * is useless here — `Boolean("0") === true` — and a row with no `status` at all
 * is a normal row, not a dead one.
 */
export const isUnavailableRow = (row: Maybe<Pick<ApiCartItem, "status">>) =>
  row?.status != null && String(row.status) === "0";

/**
 * Split the cart the way §1.5 shows it: dead rows move into their own card
 * above the items list and stop counting towards "Shipment of N items".
 */
export const splitCartRows = (rows: Maybe<ApiCartItem[]>) => {
  const available: ApiCartItem[] = [];
  const unavailable: ApiCartItem[] = [];
  (rows || []).forEach((row) =>
    (isUnavailableRow(row) ? unavailable : available).push(row)
  );
  return { available, unavailable };
};

/** §1.6: `other_variants_count > 0` makes the size pill a swap control. */
export const hasOtherVariants = (row: Maybe<Pick<ApiCartItem, "other_variants_count">>) =>
  Number(row?.other_variants_count ?? 0) > 0;

/**
 * §1.6 pill text. A row with `attribute_values` (eCommerce) gets one pill per
 * value, ordered by `sequence`, showing `label` — `value` drops the unit
 * ("100" where the design says "100 GM"), so it is only the fallback. Any
 * other module gets a single measurement pill.
 */
export const getVariantPillLabels = (row: Maybe<ApiCartItem>): string[] => {
  const attributeValues = getAttributeValues(row);
  if (attributeValues.length) {
    return attributeValues
      .slice()
      .sort((a, b) => (a?.sequence ?? 0) - (b?.sequence ?? 0))
      .map((attrValue) => {
        if (attrValue?.label) return attrValue.label;
        return attrValue?.short_code
          ? `${attrValue?.value ?? ""} ${attrValue.short_code}`.trim()
          : attrValue?.value ?? "";
      })
      .filter(Boolean);
  }
  const unit = row?.stock_unit_name || row?.unit?.translations?.short_code || "";
  const measurement = `${row?.measurement ?? ""} ${unit}`.trim();
  return measurement ? [measurement] : [];
};

/** A row is addressed by `cart_id` whenever it has one — add-ons make (product, variant) non-unique. */
export const isSameServerRow = (a: Maybe<ApiCartItem>, b: Maybe<ApiCartItem>) =>
  a?.cart_id != null || b?.cart_id != null
    ? a?.cart_id == b?.cart_id
    : a?.product_id == b?.product_id &&
      a?.product_variant_id == b?.product_variant_id;

/**
 * §1.7: cash shows only when the gateway list allows it **and** the charges
 * response allows it for this cart.
 *
 * The charges flag is named `is_cod_allowed` in the 4.0.2 spec; this codebase
 * has always read `cod_allowed`. Until the backend confirms which it sends,
 * take whichever is present — `is_cod_allowed` first, since that is the
 * documented name. `cod_payment_method` is absent on older settings payloads,
 * where the gateway list itself is the only gate.
 */
export const isCodAllowed = (
  checkoutData: Maybe<CartData>,
  paymentSetting: Maybe<PaymentSettings>
) => {
  const perCart = checkoutData?.is_cod_allowed ?? checkoutData?.cod_allowed;
  if (perCart == null || String(perCart) !== "1") return false;
  const methodFlag = paymentSetting?.cod_payment_method;
  return methodFlag == null || String(methodFlag) === "1";
};

/**
 * §1.7 / trap 14: the wallet top-up pill promises a whole amount, so the
 * shortfall rounds **up**. Rounding down leaves the wallet a fraction short of
 * what the button said it would cover. `null` when nothing is owed.
 */
export const walletTopUpShortfall = (total: Maybe<Numeric>, balance: Maybe<Numeric>) => {
  const owed = Number(total ?? 0) - Number(balance ?? 0);
  if (!Number.isFinite(owed) || owed <= 0) return null;
  return Math.ceil(owed);
};

/** True when the wallet alone settles the order — gateways and cash then hide (§1.7). */
export const walletCoversOrder = (total: Maybe<Numeric>, balance: Maybe<Numeric>) => {
  const amount = Number(total ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  return Number(balance ?? 0) >= amount;
};

/** §1.6: already-favourite rows show a heart badge instead of the "Move to favorites" link. */
export const isFavoriteRow = (row: Maybe<Pick<ApiCartItem, "is_favorite">>, favoriteIds: Maybe<Set<string>>) =>
  (row?.is_favorite != null && String(row.is_favorite) === "1") ||
  Boolean(favoriteIds?.has(String((row as Maybe<ApiCartItem>)?.product_id)));

/**
 * §1.5 swap rule: the dead line's quantity carries over to its replacement.
 * An add for 1 against a line that held more becomes an add for that more —
 * but only for a product+variant the cart does not already hold, otherwise the
 * customer's existing quantity would be overwritten.
 */
export const swapQuantity = ({
  requestedQty,
  deadRowQty,
  alreadyInCart,
}: {
  requestedQty: number;
  deadRowQty: Maybe<Numeric>;
  alreadyInCart: boolean;
}) => {
  const carried = Number(deadRowQty ?? 0);
  if (alreadyInCart || requestedQty !== 1 || carried <= 1) return requestedQty;
  return carried;
};

/** §5.1 one stock rule — a variant is buyable, or it is not. */
export const isVariantBuyable = ({
  status,
  stock,
  isUnlimitedStock,
}: {
  status?: Flag;
  stock?: Numeric;
  isUnlimitedStock?: Flag;
}) => {
  if (status != null && String(status) === "0") return false;
  // Loose `!= 0`: the flag arrives as 0, "0", 1, "1" or true depending on the
  // endpoint. The spec writes this as `== "1"`, but every product card in this
  // app reads limited as `is_unlimited_stock == 0`, and a missing flag has
  // always meant unlimited — matching that avoids blocking adds on products
  // the rest of the UI happily sells.
  if (isUnlimitedStock != 0) return true;
  return Number(stock ?? 0) > 0;
};

/** Stable "buyable first" ordering (§5.2); API order is kept inside each group. */
export const buyableFirst = <T extends { status?: Flag; stock?: Numeric; is_unlimited_stock?: Flag }>(
  variants: Maybe<T[]>,
  isUnlimitedStock?: Flag
): T[] => {
  const list = variants || [];
  const buyable = (variant: T) =>
    isVariantBuyable({
      status: variant?.status,
      stock: variant?.stock,
      isUnlimitedStock: variant?.is_unlimited_stock ?? isUnlimitedStock,
    });
  return [...list.filter(buyable), ...list.filter((variant) => !buyable(variant))];
};

/**
 * The variant a product opens on — card, quick view and product page alike, so
 * the price on the card is the price that opens: the FIRST option as the
 * customer sees it, in-stock options first.
 *
 * Attribute chips are ordered by each value's `sequence`, not by API order, so
 * `variants[0]` can be the second chip (Half Plate selected under Full Plate).
 * Variants are ranked by their chips' positions instead, attribute by
 * attribute. Plain variant lists render in API order, so first-buyable holds.
 */
export const getDefaultVariant = (
  variants: Maybe<ProductVariant[]>,
  isUnlimitedStock?: Flag
): ProductVariant | undefined => {
  const list = variants || [];
  const isBuyable = (variant: ProductVariant) =>
    isVariantBuyable({
      status: variant?.status,
      stock: variant?.stock,
      isUnlimitedStock: variant?.is_unlimited_stock ?? isUnlimitedStock,
    });
  const inStock = list.filter(isBuyable);
  const pool = inStock.length ? inStock : list;
  if (!hasAttributeVariants(list)) return pool[0];

  const attributes = buildAttributes(list);
  const chipPositions = (variant: ProductVariant) => {
    const valueIds = getAttributeValues(variant).map((value) => value.id);
    return attributes.map((attribute) => {
      const index = attribute.values.findIndex((value) => valueIds.includes(value.id));
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    });
  };
  return [...pool].sort((a, b) => {
    const pa = chipPositions(a);
    const pb = chipPositions(b);
    for (let i = 0; i < pa.length; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  })[0];
};

/** Rows that still count towards "Shipment of N items". */
export const shipmentItemCount = (rows: Maybe<ApiCartItem[]>) =>
  splitCartRows(rows).available.length;

/** Product ids of the rows passed, de-duplicated — used to prime the favourites set. */
export const rowProductIds = (rows: Maybe<ApiCartItem[]>): Id[] => [
  ...new Set((rows || []).map((row) => row?.product_id).filter((id) => id != null)),
] as Id[];
