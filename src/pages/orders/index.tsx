import React from "react";
import RedirectTo from "@/components/common/RedirectTo";
import MetaData from "@/components/metadata-component/MetaData";

// The app shares `/orders` (§12.1); this site keeps the list under the profile.
const OrdersAlias = () => (
  <>
    <MetaData pageName="/orders" title={`Orders - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
    <RedirectTo to="/profile/orderhistory" />
  </>
);

export default OrdersAlias;
