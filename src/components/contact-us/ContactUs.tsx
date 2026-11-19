import React from "react";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import { useSelector } from "react-redux";
import { isEmptyHtml } from "@/lib/utils";
import { t } from "@/utils/translation";
import NoInfoData from "../common/NoInfoData";
import type { RootState } from "@/types/state";

const ContactUs = () => {
  const setting = useSelector((state: RootState) => state?.Setting?.setting);
  return (
    <section>
      <div>
        <BreadCrumb />
      </div>
      {isEmptyHtml(setting?.contact_us) ? (
        <NoInfoData title={t("contact_us")} />
      ) : (
        <div className="container my-5 px-1 md:px-0">
          <div
            className="flex flex-col gap-4 rounded p-4 items-center bg-[var(--surface-subtle)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] infoContent"
            dangerouslySetInnerHTML={{
              __html: setting?.contact_us as string,
            }}
          />
        </div>
      )}
    </section>
  );
};

export default ContactUs;
