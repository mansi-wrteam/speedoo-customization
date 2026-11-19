// Delivery city in Redux `City.city`. Two writers:
//  - Location.jsx builds a curated object from `api.getCity()` data plus the
//    place the user picked (its own `name` / `formatted_address`);
//  - Header.jsx stores raw `api.getCity()` data for the admin's default city.
// Both are covered here, so every field but `id` is optional.

import type { Id, Numeric } from "../common";

export interface City {
  id: Id;
  name?: string;
  state?: string;
  /** Human-readable address shown in the header location chip. */
  formatted_address?: string;
  latitude?: Numeric;
  longitude?: Numeric;
  min_amount_for_free_delivery?: Numeric;
  delivery_charge_method?: string;
  fixed_charge?: Numeric;
  per_km_charge?: Numeric;
  time_to_travel?: Numeric;
  max_deliverable_distance?: Numeric;
  distance?: Numeric;
}
