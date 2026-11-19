// What a gateway's return actually told us (WEB_PARITY_V4.0.2 §11).
//
// The rule that matters: **only an explicit failure is a failure.** Anything
// unreadable, empty or unrecognised is UNRESOLVED — the order is kept, nothing
// is claimed, and the server reconciles it.
//
// Both bugs §11 describes come from breaking that rule:
//   - PhonePe's verify answers HTTP 200 with an EMPTY BODY. Read as "not
//     success", it tore down orders that had actually been paid.
//   - PayPal's two return paths report differently, so a settled payment came
//     back looking cancelled.
//
// Treating the unknown as failure is the expensive direction: it destroys a
// paid order. Treating it as unresolved costs a pending row the server cleans
// up.

type Maybe<T> = T | null | undefined;

export type PaymentOutcome = "success" | "failed" | "pending" | "unresolved";

/** Query params the gateways redirect back with. */
export interface PaymentReturnQuery {
  status?: Maybe<string>;
  status_code?: Maybe<string>;
  transaction_status?: Maybe<string>;
  type?: Maybe<string>;
  order_id?: Maybe<string>;
  payment_method?: Maybe<string>;
}

const normalise = (value: Maybe<string>) => String(value ?? "").trim().toLowerCase();

/** Every spelling of "it worked" the gateways send back. */
const SUCCESS = new Set([
  "success",
  "successful",
  "payment_success",
  "completed",
  "complete",
  "captured",
  "capture",
  "paid",
  "txn_success",
  "approved",
]);

/** Every spelling of "it definitely did not work". Nothing is inferred. */
const FAILURE = new Set([
  "failed",
  "failure",
  "fail",
  "cancel",
  "cancelled",
  "canceled",
  "declined",
  "denied",
  "rejected",
  "error",
  "payment_error",
  "payment_declined",
  "txn_failure",
  "voided",
  "expired",
]);

const PENDING = new Set(["pending", "processing", "in_progress", "initiated", "created"]);

/**
 * Read the redirect's query. Returns "unresolved" when the gateway said
 * nothing we recognise — including when it said nothing at all.
 */
export const resolveReturnOutcome = (query: Maybe<PaymentReturnQuery>): PaymentOutcome => {
  const status = normalise(query?.status);
  const transaction = normalise(query?.transaction_status);
  const code = normalise(query?.status_code);

  if (PENDING.has(status) || PENDING.has(transaction)) return "pending";
  if (FAILURE.has(status) || FAILURE.has(transaction)) return "failed";
  if (SUCCESS.has(status) || SUCCESS.has(transaction)) return "success";
  // Midtrans-style: a 200 code alongside a captured transaction.
  if (code === "200" && SUCCESS.has(transaction)) return "success";

  return "unresolved";
};

/**
 * Read a verify call's body (PhonePe's `order_status_phonepe`).
 *
 * `body` is whatever came back — `undefined` for the empty 200 that endpoint
 * currently sends, which is the whole reason this returns "unresolved"
 * instead of falling through to failure.
 */
export const resolveVerifyOutcome = (body: Maybe<{ status?: Maybe<string> }>): PaymentOutcome => {
  const status = normalise(body?.status);
  if (!status) return "unresolved";
  if (SUCCESS.has(status)) return "success";
  if (FAILURE.has(status)) return "failed";
  if (PENDING.has(status)) return "pending";
  return "unresolved";
};

/** Only an explicit failure may tear the order down. */
export const mayDeleteOrder = (outcome: PaymentOutcome) => outcome === "failed";
