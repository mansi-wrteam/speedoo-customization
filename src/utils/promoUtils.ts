// Promo code helpers.
//
// The server owns `is_applicable` — it covers expiry, usage caps and per-user
// limits, not just the order total. These helpers only compute the *explanation*
// for a blocked coupon; they never decide whether a coupon applies.

// How much more the cart needs before a coupon's minimum is met.
//
// Returns null unless the gap is provably positive. `min_order_amount` is
// optional in the schema and can arrive as the string "null", so every
// non-numeric shape has to collapse to "no message" rather than to a guess.
type PromoLike = { min_order_amount?: unknown; is_applicable?: unknown } | null | undefined;
export const shortfallFrom = (offer: PromoLike, subTotal: unknown): number | null => {
  const minimum = Number(offer?.min_order_amount);
  if (!Number.isFinite(minimum) || minimum <= 0) return null;
  const gap = minimum - Number(subTotal ?? 0);
  return gap > 0 ? gap : null;
};

// Whether the server says this coupon applies. It owns the decision (expiry,
// usage caps, per-user limits), so never re-derive it from the amount.
export const isCouponApplicable = (offer: PromoLike) =>
  offer?.is_applicable === 1 || offer?.is_applicable === "1";

// The shortfall to show for a coupon, or null to show nothing.
//
// Guarding on `is_applicable` matters: an expired coupon still carries a
// `min_order_amount`, and telling someone to add ₹200 more sends them to spend
// money on something that still won't apply.
export const couponShortfall = (offer: PromoLike, subTotal: unknown): number | null =>
  isCouponApplicable(offer) ? null : shortfallFrom(offer, subTotal);
