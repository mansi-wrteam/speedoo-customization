// Helpers for multi-attribute product variants (attribute_values based)
import type { Id, Url } from "@/types/common";
import type {
  ProductImage,
  ProductVariant,
  VariantAttributeGroup,
  VariantAttributeOption,
  VariantAttributeValue,
  VariantSelection,
} from "@/types/models/product";

type Maybe<T> = T | null | undefined;
type VariantLike = Maybe<Pick<ProductVariant, "attribute_values">>;
type ProductLike = Maybe<{ id?: Id; image_url?: Maybe<ProductImage>; images?: Maybe<ProductImage[]>; variants?: Maybe<ProductVariant[]> }>;

// API sometimes returns the same attribute value repeated per variant (join
// duplication). Always read a variant's values through this so chips, labels
// and combo matching see each value exactly once.
export const getAttributeValues = (variant: VariantLike): VariantAttributeValue[] => {
  const seen = new Set<unknown>();
  return (variant?.attribute_values || []).filter((attrValue) => {
    const key = attrValue?.id ?? `${attrValue?.attribute_id}-${attrValue?.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Build attribute matrix from variants:
// [{ id, name, type, values: [{ id, value, short_code, color_code, image_url }] }]
export const buildAttributes = (variants: Maybe<ProductVariant[]> = []): VariantAttributeGroup[] => {
  const attributeMap = new Map<Id, Omit<VariantAttributeGroup, "values"> & { values: Map<Id, VariantAttributeOption> }>();
  variants?.forEach((variant) => {
    getAttributeValues(variant).forEach((attrValue) => {
      const attribute = attrValue?.attribute;
      if (!attribute) return;
      if (!attributeMap.has(attribute.id)) {
        attributeMap.set(attribute.id, {
          id: attribute.id,
          name: attribute?.translations?.name,
          type: attribute?.type,
          values: new Map(),
        });
      }
      const entry = attributeMap.get(attribute.id)!;
      if (!entry.values.has(attrValue.id)) {
        entry.values.set(attrValue.id, {
          id: attrValue.id,
          value: attrValue.value,
          short_code: attrValue.short_code,
          color_code: attrValue.color_code,
          image_url: attrValue.image_url,
          sequence: attrValue.sequence ?? 0,
        });
      }
    });
  });
  return Array.from(attributeMap.values()).map((attribute) => ({
    ...attribute,
    values: Array.from(attribute.values.values()).sort(
      (a, b) => a.sequence - b.sequence,
    ),
  }));
};

// Selected combo of a variant: { [attributeId]: attributeValueId }
export const getVariantSelection = (variant: VariantLike): VariantSelection => {
  const selection: VariantSelection = {};
  getAttributeValues(variant).forEach((attrValue) => {
    if (attrValue?.attribute_id != null) {
      selection[attrValue.attribute_id] = attrValue.id;
    }
  });
  return selection;
};

// Find variant exactly matching selected combo
export const findVariant = (variants: Maybe<ProductVariant[]> = [], selectedAttrs: VariantSelection = {}) => {
  const selectedIds = Object.values(selectedAttrs);
  return variants?.find((variant) => {
    const variantIds = getAttributeValues(variant).map((av) => av.id);
    return (
      variantIds.length === selectedIds.length &&
      selectedIds.every((id) => variantIds.includes(id))
    );
  });
};

// Fallback resolve: variant containing given attribute value (used when exact combo missing)
export const findVariantWithValue = (variants: Maybe<ProductVariant[]> = [], attributeValueId: Maybe<Id>) => {
  return variants?.find((variant) =>
    variant?.attribute_values?.some((av) => av.id == attributeValueId),
  );
};

// Chip / cart label for a variant.
// Multi-attribute: "Black / 500". Legacy (no attribute_values): "500 PC".
export const getVariantLabel = (variant: Maybe<ProductVariant>): string => {
  if (variant?.attribute_values?.length) {
    return getAttributeValues(variant)
      .map((av) =>
        av?.short_code ? `${av.value} ${av.short_code}` : av?.value,
      )
      .filter(Boolean)
      .join(" / ");
  }
  const unit =
    variant?.stock_unit_name || variant?.unit?.translations?.short_code || "";
  return `${variant?.measurement ?? ""} ${unit}`.trim();
};

// True when product uses new attribute-based variants
export const hasAttributeVariants = (variants: Maybe<ProductVariant[]> = []) =>
  variants?.some((variant) => (variant?.attribute_values?.length as number) > 0);

// Consistent chip order: color values first, then stable by attribute id.
// API array order varies per variant (admin creation order).
export const sortAttributeValues = (attributeValues: VariantAttributeValue[] = []) =>
  getAttributeValues({ attribute_values: attributeValues }).sort((a, b) => {
    const aColor = a?.attribute?.type === "color" ? 0 : 1;
    const bColor = b?.attribute?.type === "color" ? 0 : 1;
    return aColor - bColor || ((a?.attribute_id || 0) as number) - ((b?.attribute_id || 0) as number);
  });

// Image entries differ per API: detail sends plain URL strings, list sends
// objects — accept both, always return a URL string or null
export const normalizeImage = (image: Maybe<ProductImage>): Url | null => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image?.image_url || image?.url || image?.src || image?.image || null;
};

// Cover image for a product. Variant-only products (images uploaded per
// variant, no product-level cover) come back with an empty image_url, so fall
// back to the first variant image instead of rendering a placeholder.
export const getProductImage = (product: ProductLike): Url | null => {
  const cover = normalizeImage(product?.image_url);
  if (cover) return cover;
  for (const variant of product?.variants || []) {
    const image = getVariantImage(variant, null);
    if (image) return image;
  }
  return null;
};

// Best display image for a variant: its own first gallery image, else null
// (callers fall back to the product image).
//
// Attribute value images (attribute_values[].image_url) are NOT photos of the
// variant — they illustrate an option (a colour swatch, an "Image" choice) and
// belong only to attribute chips / option boxes. Using them here showed an
// option's picture as the product photo in the variant modal, cart swaps and
// cards, so they are no longer a source.
// Every image that belongs to one specific variant — its own gallery only
// (attribute value images are option illustrations, see getVariantImage).
const variantOwnedImages = (variant: Maybe<ProductVariant>) =>
  (variant?.images || []).map(normalizeImage).filter(Boolean) as Url[];

// Gallery to show while `variant` is selected.
//
// Products with variant-wise images carry a product cover that is usually just
// the FIRST variant's photo, and `product.images` can repeat other variants'
// photos too. Including them wholesale meant picking "Red" still showed the
// Gold shot as the first thumbnail. So: the selected variant's own images
// first, then the shared product images with every other variant's photos
// removed.
//
// Products with no per-variant images are unaffected — nothing is owned by
// another variant, so this returns cover + product images exactly as before.
export const buildVariantGallery = (product: ProductLike, variant: Maybe<ProductVariant>): Url[] => {
  const own = [
    // Keep the same first pick as getVariantImage so the main preview and the
    // highlighted thumbnail agree.
    getVariantImage(variant, product?.image_url),
    ...variantOwnedImages(variant),
  ].filter(Boolean) as Url[];

  const ownSet = new Set(own);
  const otherVariantImages = new Set(
    (product?.variants || [])
      .filter((other) => other?.id !== variant?.id)
      .flatMap(variantOwnedImages)
      // A file shared with the selected variant still belongs to it.
      .filter((image) => !ownSet.has(image)),
  );

  const shared = [product?.image_url, ...(product?.images || [])]
    .map(normalizeImage)
    .filter((image) => image && !otherVariantImages.has(image)) as Url[];

  return [...new Set([...own, ...shared])];
};

// `_coverImage` kept for call-site compatibility; the cover is the callers'
// fallback, not something to filter here.
export const getVariantImage = (
  variant: Maybe<ProductVariant>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _coverImage?: Maybe<ProductImage>
): Url | null => variantOwnedImages(variant)[0] || null;
