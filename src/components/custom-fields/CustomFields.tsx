import React from "react";
import type { CustomFieldValues } from "@/api/apiRoutes";
import type { Id } from "@/types/common";
import type { CustomField, CustomFieldTranslation } from "@/types/models";

/**
 * Renders the per-tenant fields served by custom_fields/list.
 * Presentational only — the parent owns fetching, state and validation.
 *
 * values: { [fieldId]: string | string[] }
 * onChange(fieldId, value)
 */

/** One custom field value: text, the checked options of a checkbox field, or a picked File. */
export type CustomFieldValue = CustomFieldValues[string];

export interface CustomFieldsProps {
  fields?: CustomField[];
  values?: CustomFieldValues;
  onChange: (fieldId: Id, value: CustomFieldValue) => void;
  languageId?: Id;
  savedFileUrls?: Record<string, string>;
}

const INPUT_CLASS =
  "py-2 px-4 bg-[var(--form-default-background)] text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] border border-[var(--form-default-border)] outline-none rounded-sm w-full";

// `translations` comes back as an array of rows when the request carries no
// Content-Language, and as a single resolved object when it does — handle both.
const translationFor = (
  field: CustomField,
  languageId?: Id,
): CustomFieldTranslation | null => {
  const translations = field?.translations;
  if (!translations) return null;
  if (Array.isArray(translations)) {
    return (
      translations.find((tr) => tr?.language_id == languageId) ??
      translations[0] ??
      null
    );
  }
  return translations;
};

const fieldLabel = (field: CustomField, languageId?: Id): string =>
  translationFor(field, languageId)?.name || field?.name || "";

const fieldOptions = (field: CustomField, languageId?: Id): string[] => {
  const raw = translationFor(field, languageId)?.options || field?.options;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw)
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
};

const CustomFields = ({
  fields = [],
  values = {},
  onChange,
  languageId,
  // Existing saved file URL per field id (id -> url), shown as a link below
  // a file input on edit screens — the input itself can't be preloaded with
  // a File object, so this is the only way the user sees what's on record.
  savedFileUrls = {},
}: CustomFieldsProps) => {
  if (!fields?.length) return null;

  return (
    <>
      {[...fields]
        .sort((a, b) => ((a?.sort_order as number) || 0) - ((b?.sort_order as number) || 0))
        .map((field) => {
          const label = fieldLabel(field, languageId);
          const options = fieldOptions(field, languageId);
          const value = values?.[field.id] ?? (field?.type === "checkbox" ? [] : "");

          return (
            <div className="flex flex-col gap-1" key={field.id}>
              <span className="font-bold text-base text-[var(--form-default-label)] capitalize">
                {label}
                {field?.is_required && (
                  <span className="text-[var(--form-default-required)]">*</span>
                )}
              </span>

              {field?.type === "textarea" ? (
                <textarea
                  className={`${INPUT_CLASS} resize-none h-24`}
                  placeholder={label}
                  value={value as string}
                  onChange={(e) => onChange(field.id, e.target.value)}
                />
              ) : field?.type === "dropdown" || field?.type === "select" ? (
                <select
                  className={INPUT_CLASS}
                  value={value as string}
                  onChange={(e) => onChange(field.id, e.target.value)}
                >
                  <option value="">{label}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field?.type === "radio" ? (
                <div className="flex flex-wrap gap-4">
                  {options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 cursor-pointer text-base text-[var(--foreground-primary)]"
                    >
                      <input
                        type="radio"
                        name={`custom-field-${field.id}`}
                        className="h-4 w-4 accent-[var(--radio-selected-background)]"
                        checked={value === option}
                        onChange={() => onChange(field.id, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : field?.type === "checkbox" ? (
                <div className="flex flex-wrap gap-4">
                  {options.map((option) => {
                    const selected = Array.isArray(value) ? value : [];
                    return (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer text-base text-[var(--foreground-primary)]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--checkbox-checked-background)]"
                          checked={selected.includes(option)}
                          onChange={() =>
                            onChange(
                              field.id,
                              selected.includes(option)
                                ? selected.filter((item) => item !== option)
                                : [...selected, option],
                            )
                          }
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              ) : field?.type === "file" ? (
                <>
                  <input
                    type="file"
                    className={INPUT_CLASS}
                    onChange={(e) => onChange(field.id, e.target.files?.[0])}
                  />
                  {savedFileUrls?.[field.id] && !(value instanceof File) && (
                    <a
                      href={savedFileUrls[field.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--brand-foreground-default)] underline"
                    >
                      View current file
                    </a>
                  )}
                </>
              ) : (
                <input
                  type={
                    field?.type === "number"
                      ? "number"
                      : field?.type === "date"
                        ? "date"
                        : field?.type === "email"
                          ? "email"
                          : "text"
                  }
                  className={INPUT_CLASS}
                  placeholder={label}
                  value={value as string}
                  onChange={(e) => onChange(field.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
    </>
  );
};

export default CustomFields;
export { fieldLabel };
