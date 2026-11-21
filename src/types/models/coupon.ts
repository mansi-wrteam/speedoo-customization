import type { DateString, Id, Nullable, Numeric } from "../common";

export interface CouponHistoryEntry {
  id: Id;
  code: string;
  amount: Numeric;
  redeemed_at: DateString;
  wallet_transaction_id: Nullable<Id>;
  status: string;
}

/** `data` of `POST coupon/redeem`. */
export interface CouponRedeemData extends CouponHistoryEntry {
  new_balance: Numeric;
}
