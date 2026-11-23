import React from "react";
import { useRouter } from "next/router";
import RedirectTo from "./RedirectTo";
import { isCreditEnabled } from "@/utils/credit";

const RedirectToWalletCredit = () => {
  const { query } = useRouter();
  const orderId = isCreditEnabled() && typeof query.order_id === "string" ? query.order_id : undefined;
  return <RedirectTo to={orderId ? `/profile/wallet-credit?order_id=${encodeURIComponent(orderId)}` : "/profile/wallet-credit"} />;
};

export default RedirectToWalletCredit;
