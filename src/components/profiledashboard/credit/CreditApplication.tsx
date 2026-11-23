import React from "react";
import { t } from "@/utils/translation";
import { blockedReasonKey } from "@/utils/credit";
import type { CreditStatusData } from "@/types/models";
import CreditApplyForm from "./CreditApplyForm";

export interface CreditApplicationProps {
  data: CreditStatusData;
  onRefresh: () => void;
}

const CreditApplication = ({ data, onRefresh }: CreditApplicationProps) => {
  const { credit_status: status, application } = data;
  const blockedKey = blockedReasonKey(data.purchase_blocked_reason);

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-lg font-medium text-[var(--foreground-primary)]">{t("credit_under_review")}</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_under_review_desc")}</p>
        {application?.documents?.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {application.documents.map((doc, index) => (
              <li key={`${doc.url}-${index}`}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-foreground-default)] underline">
                  {doc.type}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {status === "rejected" && (
        <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium">{t("credit_rejected_title")}</div>
          {application?.admin_note && (
            <div>
              {t("credit_admin_note")}: {application.admin_note}
            </div>
          )}
        </div>
      )}
      {data.can_apply ? (
        <CreditApplyForm onSubmitted={onRefresh} />
      ) : (
        blockedKey && <div className="p-4 text-sm text-[var(--foreground-secondary)]">{t(blockedKey)}</div>
      )}
    </div>
  );
};

export default CreditApplication;
