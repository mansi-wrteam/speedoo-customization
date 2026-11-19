import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import React, { useState } from "react";
import { IoMdArrowDropdown } from "react-icons/io";
import { IoMdArrowDropup } from "react-icons/io";

/** A subscription FAQ flattened by the caller (SubscriptionsFaqs) from `Faq.translations`. */
export interface SubscriptionFaqCardProps {
  faq: {
    question?: string;
    answer?: string;
  };
}

const SubscriptionFaqCard = ({ faq }: SubscriptionFaqCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`w-full p-2 rounded-md border  mb-2 mx-3 ${isOpen
        ? "bg-[var(--surface-subtle)] border-[var(--border-default)]"
        : "bg-[var(--surface-default)] border-[var(--border-subtle)]"
        }`}
    >
      <CollapsibleTrigger
        className={`w-full flex justify-between gap-3 items-center p-2 font-bold ${isOpen
          ? "text-[var(--foreground-secondary)]"
          : "text-[var(--foreground-primary)]"
          }`}
      >
        <div>
          <h3 className="text-lg font-bold text-left md:text-center overflow-hidden">
            {faq?.question}
          </h3>
        </div>
        <div className="flex items-center">
          {isOpen ? (
            <div className=" inline-flex items-center justify-center">
              <IoMdArrowDropup size={24} />
            </div>
          ) : (
            <div className=" inline-flex items-center justify-center">
              <IoMdArrowDropdown size={24} />
            </div>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={`p-3 text-[var(--foreground-tertiary)] ${isOpen ? "border-t border-[var(--border-default)] mt-2 " : ""
          }`}
      >
        {faq?.answer}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SubscriptionFaqCard;
