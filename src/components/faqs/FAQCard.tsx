import React, { useState } from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FaMinus, FaPlus } from "react-icons/fa6";
import type { Faq } from "@/types/models";

export interface FAQCardProps {
    faq: Faq;
}

const FAQCard = ({ faq }: FAQCardProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mx-3 mb-2 w-full rounded-lg bg-[var(--surface-subtle)] p-2 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]'>
            <CollapsibleTrigger className={`w-full flex justify-between gap-3 items-center p-2 font-bold`}>
                <div>
                    <h3 className="text-lg font-bold text-left md:text-center">{faq?.translations?.question}</h3>
                </div>
                <div className='flex items-center'>
                    {isOpen ?
                        <div className='inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]'>
                            <FaMinus size={24} className='text-[var(--brand-foreground-inverse)]' />
                        </div> :
                        <div className='inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]'>
                            <FaPlus size={24} className='text-[var(--brand-foreground-inverse)]' />
                        </div>
                    }
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className={`p-3 ${isOpen ? 'mt-2 border-t border-[var(--border-subtle)] text-[var(--foreground-secondary)]' : ''}`}>
                {faq?.translations?.answer}
            </CollapsibleContent>
        </Collapsible>
    )
}

export default FAQCard
