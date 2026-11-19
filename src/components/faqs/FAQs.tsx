import React, { useEffect, useState } from "react";
import { useServerData } from "@/utils/useServerData";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import * as api from "../../api/apiRoutes";
import FAQCard from "./FAQCard";
import { t } from "@/utils/translation";
import CardSkeleton from "../skeleton/CardSkeleton";
import NoInfoData from "../common/NoInfoData";
import type { Faq } from "@/types/models";


const FAQs = () => {
  // Present only when the server rendered this page and already fetched page 1
  // (SSR_PLAN.md §3.5, channel 3). Undefined in the static export, for a
  // non-default language, and on client-side navigation — in which case this
  // component fetches on mount exactly as it always has.
  const serverFaqs = useServerData<{ data: Faq[]; total: number }>("faqs");

  const [faqs, setFaqs] = useState<Faq[]>(serverFaqs?.data ?? []);
  const total_faqs_per_page = 7;
  const [currPage, setcurrPage] = useState(1);
  const [offset, setoffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalFaqs, setTotalFaqs] = useState(serverFaqs?.total ?? 0);

  useEffect(() => {
    // Skipped when the server already supplied page 1; refetching it would
    // duplicate the rows (handleFetchFAQs appends) and flash the list.
    if (serverFaqs) return;
    handleFetchFAQs();
  }, []);

  const handleFetchFAQs = async (offset = 0) => {
    setIsLoading(true);
    try {
      const response = await api.getFAQs({
        limit: total_faqs_per_page,
        offset,
      });
      setFaqs([...faqs, ...response?.data]);
      setTotalFaqs(response?.total as number);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log("FAQs page error: ", error);
    }
  };
  const handlePageChange = (pageNum: number) => {
    setcurrPage(pageNum);
    setoffset(pageNum * total_faqs_per_page - total_faqs_per_page);
    handleFetchFAQs(pageNum * total_faqs_per_page - total_faqs_per_page);
  };
  return (
    <section>
      <div>
        <BreadCrumb />
      </div>
      <div className="container my-4 flex flex-col items-center gap-4 px-4 md:px-0">
        {!isLoading && faqs?.length === 0 && <NoInfoData title={t("faqs")} />}
        {faqs?.map((faq, idx) => (
          <FAQCard key={idx} faq={faq} />
        ))}
        {isLoading &&
          Array.from({ length: total_faqs_per_page }).map((_, idx) => (
            <div key={idx} className="w-full">
              <CardSkeleton height={40} padding="p-1" />
            </div>
          ))}
        {totalFaqs > faqs?.length && (
          <button
            className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)] flex items-center"
            onClick={() => handlePageChange(currPage + 1)}
          >
            {t("load_more")}
          </button>
        )}
      </div>
    </section>
  );
};

export default FAQs;
