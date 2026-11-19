import React, { useEffect } from "react";
import Layout from "../layout/Layout";
import TermsAndCondititons from "../terms-and-conditions/TermsAndCondititons";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";

const TermsAndCondititionsPage = () => {
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  useEffect(() => {}, [language?.id]);
  return (
    <Layout>
      <TermsAndCondititons />
    </Layout>
  );
};

export default TermsAndCondititionsPage;
