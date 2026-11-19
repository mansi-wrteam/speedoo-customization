import React from "react";
import RedirectTo from "@/components/common/RedirectTo";
import MetaData from "@/components/metadata-component/MetaData";

// The app shares `/wallet` (§12.1); this site keeps it under the profile.
const WalletAlias = () => (
  <>
    <MetaData pageName="/wallet" title={`Wallet - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
    <RedirectTo to="/profile/wallethistory" />
  </>
);

export default WalletAlias;
