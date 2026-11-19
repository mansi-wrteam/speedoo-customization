// Signed-in customer, as returned by `api.getUser()` (`response.user`) and
// stored in Redux `User.user`.

import type { DateString, Flag, Id, Numeric, Nullable, Url } from "../common";

/**
 * How the current session signed in (Redux `User.authType`). `""` before login.
 * `"number"` is set by Login.jsx when the phone form is first shown, before OTP.
 */
export type AuthType = "" | "email" | "google" | "phone" | "number";

/** A value the customer saved for a tenant custom field (`user.custom_fields`). */
export interface UserCustomFieldValue {
  /** Custom field id — matches `CustomField.id` from custom_fields/list. */
  id: Id;
  /** Field type, e.g. `"file"`, `"checkbox"`, `"text"` (see CustomField.type). */
  type?: string;
  /** Saved value. File fields hold a URL; checkbox values may be a comma-joined string. */
  value?: Nullable<string | string[]>;
}

export interface User {
  id: Id;
  name?: string;
  email?: string;
  mobile?: string;
  /** Dial code, e.g. `"+91"`. */
  country_code?: string;
  /** Wallet balance. The user slice does `balance -= n` / `+= n`, so it is kept numeric. */
  balance?: number;
  /** Profile image URL. */
  profile?: Url;
  /**
   * Read by Profile.jsx (`!user?.profileImage`) but not known to be sent by the
   * API — the image field is `profile`. Kept so the existing check type-checks.
   */
  profileImage?: Url;
  referral_code?: string;
  /** Account status; login flows compare `user.status == 1` (active). */
  status?: Flag;
  custom_fields?: UserCustomFieldValue[];
  /** Whether the subscription feature is on for this user (truthy check). */
  is_subscription_plans?: Flag;
  /** `1` active, `2` expired (renew), `0` never subscribed — compared with `==`. */
  has_active_subscription?: Numeric;
  subscription_name?: string;
  user_subscription_plan_name?: string;
  subscription_expiry_date?: DateString;
}

/** `data` of a successful login / register / verify-OTP response. */
export interface LoginResponseData {
  access_token: string;
  user?: User;
}
