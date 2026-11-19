import React, { useEffect } from "react";
import Layout from "../layout/Layout";
import AboutUs from "../about-us/AboutUs";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";

const AboutUsPage = () => {

  const language = useSelector((state: RootState) => state.Language.selectedLanguage)

  useEffect(() => { }, [language?.id])

  return (
    <Layout>
      <AboutUs />
    </Layout>
  );
};

export default AboutUsPage;
