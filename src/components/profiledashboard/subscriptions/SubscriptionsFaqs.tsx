import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { t } from "@/utils/translation";
import SubscriptionsFaq from "@/components/faqs/SubscriptionFaqCard";
import type { Faq } from "@/types/models";

export interface SubscriptionsFaqsProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  faqs: Faq[];
  totalFaqs: number;
  /** Passed by Subscriptions but not read. */
  faqLoading: boolean;
  fetchSubscriptionFaqs: (isLoadMore?: boolean) => Promise<void>;
}

const SubscriptionsFaqs = ({ isOpen, setIsOpen, faqs, totalFaqs, faqLoading, fetchSubscriptionFaqs }: SubscriptionsFaqsProps) => {
  const onClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className=" md:p-6 focus-visible:outline-none focus:outline-none shadow-2xl max-w-4xl w-full  "
        style={{ backgroundColor: "var(--surface-default)" }}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex justify-between items-start  border-b border-[var(--border-subtle)] pb-2">
              <div>
                <h2 className="text-2xl font-bold text-[var(--foreground-primary)]">
                  {t("faqs_for_subscription")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--button-link-foreground-default)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 items-center">
          <div className="mt-6 space-y-4 overflow-y-auto overflow-x-hidden   w-full  h-[400px]">
            {faqs?.map((faq, index) => (
              <div key={index} className="">
                <SubscriptionsFaq
                  faq={{
                    question: faq?.translations?.question,
                    answer: faq?.translations?.answer
                  }}
                />
              </div>
            ))}
            <div className="col-span-12 mt-6 w-full flex justify-center mx-auto">
              {totalFaqs > faqs?.length ? (
                <button
                  className="px-4 py-2 bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] rounded-lg inline-flex justify-center items-center gap-1 text-[var(--button-secondary-foreground-default)] text-base font-bold transition-colors"
                  onClick={() => fetchSubscriptionFaqs(true)}
                >
                  {t("load_more")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionsFaqs;
