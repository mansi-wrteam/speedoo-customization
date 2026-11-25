import type { DateString, Id, Nullable, Numeric, Url } from "../common";

export type CreditStatus = "none" | "pending" | "approved" | "rejected";
export type CreditAccountStatus = "active" | "suspended";
export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";
export type CreditOrderStatus = "active" | "completed" | "cancelled";
export type CreditPaymentMethod = "wallet" | "cash";
export type CreditPaymentStatus = "pending" | "confirmed" | "rejected";
export type LedgerEntryType = "purchase" | "repayment" | "refund" | "adjustment" | "limit_change";
export type LedgerDirection = "debit" | "credit";
export type InstallmentFeeType = "fixed" | "percentage";
export type CreditDocumentType = "id_proof" | "address_proof" | "other";

/** Error keys documented by the backend; the API itself returns the translated sentence. */
export type CreditBlockedReason =
  | "credit_account_not_found"
  | "credit_account_suspended"
  | "credit_overdue_installments_block_purchase";

export interface CreditAccount {
  credit_limit: Numeric;
  outstanding_amount: Numeric;
  available_credit: Numeric;
  status: CreditAccountStatus;
}

export interface CreditDocument {
  type: string;
  url: Url;
}

export interface CreditApplication {
  id: Id;
  status: Exclude<CreditStatus, "none">;
  admin_note: Nullable<string>;
  requested_limit: Nullable<Numeric>;
  documents: CreditDocument[];
  created_at: DateString;
  reviewed_at: Nullable<DateString>;
}

/** `data` of `GET credit/status`. */
export interface CreditStatusData {
  credit_status: CreditStatus;
  /** `null` until approved. */
  account: Nullable<CreditAccount>;
  /** `null` if never applied. */
  application: Nullable<CreditApplication>;
  can_apply: boolean;
  has_overdue: boolean;
  overdue_amount: Numeric;
  /** `null` means the user can buy on credit. */
  purchase_blocked_reason: Nullable<CreditBlockedReason | string>;
}

export interface CreditScheduleItem {
  installment_no: number;
  due_date: DateString;
  amount: Numeric;
}

export interface CreditQuote {
  principal: Numeric;
  fee: Numeric;
  total_payable: Numeric;
  schedule: CreditScheduleItem[];
}

export interface InstallmentPlan {
  id: Id;
  name: string;
  duration_months: number;
  fee_type: InstallmentFeeType;
  fee_value: Numeric;
  min_order_amount: Nullable<Numeric>;
  /** Present when `amount` was sent to `GET credit/plans`. */
  quote?: CreditQuote;
}

/** `data` of `GET credit/plans`. */
export interface CreditPlansData {
  plans: InstallmentPlan[];
  available_credit: Numeric;
  purchase_blocked_reason: Nullable<CreditBlockedReason | string>;
}

/** `data` of `POST credit/quote`. */
export interface CreditQuoteData extends CreditQuote {
  plan: Pick<InstallmentPlan, "id" | "name" | "duration_months">;
  available_credit: Numeric;
  within_limit: boolean;
}

export interface CreditPayment {
  id: Id;
  installment_id?: Id;
  method: CreditPaymentMethod;
  amount: Numeric;
  status: CreditPaymentStatus;
  receipt_no: Nullable<string>;
  note?: Nullable<string>;
  created_at?: DateString;
}

export interface CreditOrderSummary {
  order_id: Id;
  seller_id: Id;
  total_payable: Numeric;
  paid_amount: Numeric;
  status: CreditOrderStatus;
}

export interface Installment {
  id: Id;
  order_id: Id;
  installment_no: number;
  due_date: DateString;
  amount: Numeric;
  paid_amount: Numeric;
  status: InstallmentStatus;
  /** Added by the installments list. */
  remaining?: Numeric;
  credit_order?: CreditOrderSummary;
  /** Added by `GET credit/order`. */
  payments?: CreditPayment[];
}

/** One seller's schedule in `GET credit/order` (`data.credit_orders[]`). */
export interface CreditOrder {
  credit_order_id: Id;
  seller_id: Id;
  seller_name?: Nullable<string>;
  principal: Numeric;
  fee: Numeric;
  total_payable: Numeric;
  status: CreditOrderStatus;
  /** These carry no `order_id`; it is `CreditOrderDetailData.order_id`. */
  installments: Omit<Installment, "order_id">[];
}

/** `data` of `GET credit/order`. */
export interface CreditOrderDetailData {
  order_id: Id;
  plan: Pick<InstallmentPlan, "id" | "name" | "duration_months">;
  principal: Numeric;
  fee: Numeric;
  total_payable: Numeric;
  schedule: CreditScheduleItem[];
  credit_orders: CreditOrder[];
  payments: CreditPayment[];
}

/** `data` of `GET credit/dashboard`. */
export interface CreditDashboardData {
  account: CreditAccount;
  active_plans: number;
  paid_installments: number;
  unpaid_installments: number;
  overdue_installments: number;
  overdue_amount: Numeric;
  next_due: Nullable<Installment>;
  upcoming: Installment[];
}

/** `data` of `POST credit/pay_wallet`. */
export interface CreditPayWalletData {
  payment: CreditPayment;
  wallet_balance: Numeric;
  outstanding_amount: Numeric;
  available_credit: Numeric;
}

export interface CreditLedgerEntry {
  id?: Id;
  entry_type: LedgerEntryType;
  direction: LedgerDirection;
  amount: Numeric;
  outstanding_after: Numeric;
  order_id: Nullable<Id>;
  reference: Nullable<string>;
  note: Nullable<string>;
  created_at: DateString;
}

export interface CustomerActivity {
  id: string;
  type: string;
  title: string;
  amount: Numeric;
  direction: "in" | "out";
  order_id: Nullable<Id>;
  created_at: DateString;
}
