import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/api/apiRoutes";
import type { CustomFieldValues } from "@/api/apiRoutes";
import type { Id } from "@/types/common";
import type { CustomField } from "@/types/models";
import type { CustomFieldValue } from "./CustomFields";
import { fieldLabel } from "./CustomFields";

export interface UseCustomFieldsOptions {
  enabled?: boolean;
  /** Record type the fields belong to. */
  module?: string;
  languageId?: Id;
  initialValues?: CustomFieldValues;
}

/**
 * Loads the tenant's customer custom fields and holds their values.
 * `enabled` keeps the request tied to the modal being open.
 *
 * `initialValues`: optional { [fieldId]: value } to seed the form with —
 * used on the edit-profile screen, where the user already has saved custom
 * field values (from user_details), unlike registration where the form
 * starts blank. Seeded once, after the field definitions load, so it
 * doesn't wipe out edits the user has already made. File-type values are
 * skipped: the saved value there is a URL string, not a File the <input
 * type="file"> could accept — CustomFields shows it as an existing-file link
 * instead, and a fresh custom_fields[id] is only sent if the user picks a
 * new file.
 */
const useCustomFields = ({
  enabled = true,
  module = "customer",
  languageId,
  initialValues,
}: UseCustomFieldsOptions = {}) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<CustomFieldValues>({});
  const seededRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const fetchFields = async () => {
      try {
        const res = await api.getCustomFields({ module, active_only: 1 });
        if (!cancelled && res?.status == 1) {
          setFields(res?.data ?? []);
        }
      } catch (error) {
        // Surfaced explicitly — a silent failure here just renders no fields.
        console.error("custom_fields/list failed", error);
      }
    };
    fetchFields();
    return () => {
      cancelled = true;
    };
  }, [enabled, module]);

  useEffect(() => {
    if (seededRef.current || !fields.length || !initialValues) return;
    seededRef.current = true;
    const seeded: CustomFieldValues = {};
    fields.forEach((field) => {
      if (field?.type === "file") return;
      const raw = initialValues?.[field.id];
      if (raw === undefined || raw === null || raw === "") return;
      seeded[field.id] =
        field?.type === "checkbox" && typeof raw === "string"
          ? raw.split(",").map((v) => v.trim()).filter(Boolean)
          : raw;
    });
    if (Object.keys(seeded).length) {
      setValues((prev) => ({ ...seeded, ...prev }));
    }
  }, [fields, initialValues]);

  const handleChange = useCallback((fieldId: Id, value: CustomFieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const resetValues = useCallback(() => setValues({}), []);

  // Returns the label of the first empty required field, or null when valid.
  const getMissingRequired = useCallback(() => {
    const missing = fields.find((field) => {
      if (!field?.is_required) return false;
      const value = values?.[field.id];
      if (Array.isArray(value)) return value.length === 0;
      return value === undefined || value === null || value === "";
    });
    return missing ? fieldLabel(missing, languageId) : null;
  }, [fields, values, languageId]);

  return { fields, values, handleChange, resetValues, getMissingRequired };
};

export default useCustomFields;
