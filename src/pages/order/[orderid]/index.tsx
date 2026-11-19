import React from "react";
import { useRouter } from "next/router";
import RedirectTo from "@/components/common/RedirectTo";
import MetaData from "@/components/metadata-component/MetaData";

// The app shares `/order/<id>` (§12.1); this site serves it at /order-detail/<id>.
const OrderAlias = () => {
  const { orderid } = useRouter().query;
  return (
    <>
      <MetaData pageName="/order" title={`Order - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
      <RedirectTo to={`/order-detail/${orderid ?? ""}`} />
    </>
  );
};

export default OrderAlias;
