import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import type { CreditDocumentType } from "@/types/models";

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const DOCUMENT_TYPES: { value: CreditDocumentType; label: string }[] = [
  { value: "id_proof", label: "credit_doc_id_proof" },
  { value: "address_proof", label: "credit_doc_address_proof" },
  { value: "other", label: "credit_doc_other" },
];

interface PickedDocument {
  file: File;
  type: CreditDocumentType;
}

export interface CreditApplyFormProps {
  onSubmitted: () => void;
}

const CreditApplyForm = ({ onSubmitted }: CreditApplyFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [requestedLimit, setRequestedLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const accepted: PickedDocument[] = [];
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(t("credit_file_type_invalid"));
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(t("credit_file_too_large"));
        continue;
      }
      accepted.push({ file, type: "id_proof" });
    }
    if (documents.length + accepted.length > MAX_FILES) {
      toast.error(t("credit_max_files"));
    }
    setDocuments((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
  };

  const setType = (index: number, type: CreditDocumentType) =>
    setDocuments((prev) => prev.map((doc, i) => (i === index ? { ...doc, type } : doc)));

  const removeDocument = (index: number) => setDocuments((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (documents.length === 0) {
      toast.error(t("credit_min_files"));
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.applyForCredit({
        documents: documents.map((doc) => doc.file),
        documentTypes: documents.map((doc) => doc.type),
        requestedLimit: requestedLimit.trim() || undefined,
      });
      if (response.status == 1) {
        toast.success(response.message || t("credit_application_submitted"));
        onSubmitted();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("Error", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-lg font-medium text-[var(--foreground-primary)]">{t("credit_apply_title")}</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_apply_desc")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--foreground-primary)]">{t("credit_documents")}</span>
        <span className="text-xs text-[var(--foreground-secondary)]">{t("credit_document_hint")}</span>
        {documents.map((doc, index) => (
          <div
            key={`${doc.file.name}-${index}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] p-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground-primary)]">{doc.file.name}</span>
            <select
              value={doc.type}
              onChange={(e) => setType(index, e.target.value as CreditDocumentType)}
              className="rounded-md border border-[var(--border-subtle)] bg-transparent p-1 text-sm"
              aria-label={t("credit_documents")}
            >
              {DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeDocument(index)}
              className="text-sm text-[var(--brand-foreground-default)]"
            >
              {t("remove")}
            </button>
          </div>
        ))}
        {documents.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="self-start rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--brand-foreground-default)]"
          >
            {t("credit_add_document")}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--foreground-primary)]">{t("credit_requested_limit")}</span>
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={requestedLimit}
          onChange={(e) => setRequestedLimit(e.target.value)}
          className="rounded-lg border border-[var(--border-subtle)] bg-transparent p-2"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-[var(--brand-foreground-default)] px-6 py-2 text-white disabled:opacity-50"
      >
        {submitting ? t("loading") : t("credit_submit_application")}
      </button>
    </form>
  );
};

export default CreditApplyForm;
