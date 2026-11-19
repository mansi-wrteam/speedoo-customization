import type { Id } from "@/types/common";
import type {
  Product,
  ProductCustomFieldEntry,
  ProductCustomFieldValue,
} from "@/types/models";

/** One normalised specification row (empty values are filtered out). */
export interface SpecificationRow {
  name: string;
  value: string;
  type?: string | null;
}

// Specification rows come from `custom_field_values` on product_by_id.
// That field arrives in more than one shape depending on the product, so
// normalise to a flat [{ name, value }] list here:
//   { "2": "snapdragon" }                       -> keyed by custom-field id
//   [{ id, name, value }]                       -> already labelled
// Labels are looked up in `custom_fields` when the payload includes the field
// definitions; otherwise the id is used so the row still renders.
export const getSpecificationRows = (product: Product | null | undefined): SpecificationRow[] => {
  const raw = product?.custom_field_values ?? product?.specifications;
  if (!raw) return [];

  const definitions = product?.custom_fields ?? [];
  const nameById = new Map(
    definitions.map((field) => [
      String(field?.id),
      field?.translations?.name ?? field?.name ?? field?.title,
    ])
  );
  const typeById = new Map(
    definitions.map((field) => [String(field?.id), field?.type])
  );

  const label = (id: Id | undefined, field: ProductCustomFieldEntry | null) =>
    field?.translations?.name ??
    field?.name ??
    field?.title ??
    nameById.get(String(id)) ??
    String(id);

  // "file" fields carry an image URL as their value — the {id: value}
  // shape has no type of its own, so look it up from custom_fields.
  const type = (id: Id | undefined, field: ProductCustomFieldEntry | null) => field?.type ?? typeById.get(String(id));

  // Multi-select custom fields come back as arrays.
  const text = (value: ProductCustomFieldValue | undefined) =>
    Array.isArray(value) ? value.filter(Boolean).join(", ") : value;

  const rows = Array.isArray(raw)
    ? raw.map((field) => ({
        name: label(field?.id, field),
        value: text(field?.value ?? field?.translations?.value),
        type: type(field?.id, field),
      }))
    : Object.entries(raw).map(([id, value]) => ({
        name: label(id, null),
        value: text(value),
        type: type(id, null),
      }));

  return rows.filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== ""
  ) as SpecificationRow[];
};

